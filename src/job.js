"use strict";

const { acquireRunLock } = require("./lock");
const { Notifier } = require("./notifier");
const { buildAlertsUrl, getWithRetry } = require("./httpClient");
const { readLastState, writeLastState } = require("./stateStore");
const { getRegionNameById } = require("./regionCatalog");
const { logger } = require("./logger");

async function runJob(config) {
  const releaseLock = await acquireRunLock(config.job.lockFilePath);
  if (!releaseLock) {
    logger.warn("Another job instance is already running; skipping this run", {
      lockFilePath: config.job.lockFilePath
    });
    return { skipped: true };
  }

  try {
    const requestUrl = buildAlertsUrl(config.api);
    logger.info("Starting alerts polling job", {
      host: config.api.host,
      regionId: config.api.regionId,
      requestUrl,
      useStub: config.job.useStub
    });

    let response;
    if (config.job.useStub) {
      response = {
        status: 200,
        alertState: config.job.stubResponse,
        rawBody: config.job.stubResponse
      };
      logger.warn("Stub mode enabled. External API request skipped", {
        stubResponse: config.job.stubResponse
      });
    } else {
      response = await getWithRetry({
        url: requestUrl,
        token: config.api.token,
        timeoutMs: config.api.timeoutMs,
        maxRetries: config.api.maxRetries,
        retryBaseDelayMs: config.api.retryBaseDelayMs
      });
    }

    const normalizedAlertState =
      config.job.treatPAsA && response.alertState === "P" ? "A" : response.alertState;

    logger.info("Alerts data fetched successfully", {
      status: response.status,
      regionId: config.api.regionId,
      alertState: response.alertState,
      normalizedAlertState,
      treatPAsA: config.job.treatPAsA
    });

    const currentState = {
      regionId: config.api.regionId,
      alertState: normalizedAlertState
    };
    const regionName = getRegionNameById(config.api.regionId);
    const lastState = await readLastState(config.job.stateFilePath);
    const isSameState =
      Boolean(lastState) &&
      lastState.regionId === currentState.regionId &&
      lastState.alertState === currentState.alertState;
    const forceNotify = config.job.alwaysSendTgMessage;

    if (isSameState && !forceNotify) {
      logger.info("Alert state unchanged; notification skipped", {
        regionId: currentState.regionId,
        alertState: currentState.alertState,
        stateFilePath: config.job.stateFilePath
      });
      return { skipped: false, notified: false, changed: false };
    }

    if (isSameState && forceNotify) {
      logger.info("Alert state unchanged but forced notification is enabled", {
        regionId: currentState.regionId,
        alertState: currentState.alertState
      });
    }

    logger.info("Sending notification", {
      previousState: lastState ? lastState.alertState : null,
      currentState: currentState.alertState,
      regionId: currentState.regionId,
      regionName,
      forced: forceNotify,
      rawAlertState: response.alertState
    });

    const notifier = new Notifier(config.telegram);
    await notifier.notify({
      regionId: config.api.regionId,
      regionName,
      responseStatus: response.status,
      alertState: currentState.alertState,
      rawAlertState: response.alertState,
      source: config.job.useStub ? "stub" : "api",
      rawBody: response.rawBody
    });
    await writeLastState(config.job.stateFilePath, currentState);

    logger.info("Notification step completed", {
      regionId: config.api.regionId,
      stateFilePath: config.job.stateFilePath
    });

    return { skipped: false, notified: true, changed: !isSameState };
  } finally {
    await releaseLock();
  }
}

module.exports = {
  runJob
};
