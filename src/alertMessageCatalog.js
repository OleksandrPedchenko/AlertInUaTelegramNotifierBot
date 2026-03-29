"use strict";

class AlertMessageCatalog {
  constructor() {
    this.messageBuilders = {
      A: (ctx) =>
        [
          "<b>Статус: A</b>",
          "Повітряна тривога активна в усій області.",
          "",
          `Region: <b>${this.escapeHtml(ctx.regionName || "Unknown region")}</b>`,
          `Region ID: <b>${this.escapeHtml(ctx.regionId)}</b>`,
          `Source: ${this.escapeHtml(ctx.source || "api")}`,
          `Time: ${this.escapeHtml(ctx.time)}`
        ].join("\n"),
      N: (ctx) =>
        [
          "<b>Статус: N</b>",
          "Немає інформації про повітряну тривогу.",
          "",
          `Region: <b>${this.escapeHtml(ctx.regionName || "Unknown region")}</b>`,
          `Region ID: <b>${this.escapeHtml(ctx.regionId)}</b>`,
          `Source: ${this.escapeHtml(ctx.source || "api")}`,
          `Time: ${this.escapeHtml(ctx.time)}`
        ].join("\n"),
      P: (ctx) =>
        [
          "<b>Статус: P</b>",
          "Часткова тривога в районах чи громадах.",
          "",
          `Region: <b>${this.escapeHtml(ctx.regionName || "Unknown region")}</b>`,
          `Region ID: <b>${this.escapeHtml(ctx.regionId)}</b>`,
          `Source: ${this.escapeHtml(ctx.source || "api")}`,
          `Time: ${this.escapeHtml(ctx.time)}`
        ].join("\n")
    };
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  getMessageByStatus(status, context = {}) {
    const normalizedStatus = String(status || "").trim().toUpperCase();
    const builder = this.messageBuilders[normalizedStatus];
    const safeContext = {
      ...context,
      time: context.time || new Date().toISOString()
    };

    if (builder) {
      return builder(safeContext);
    }

    return [
      "<b>Air Raid Alert: UNKNOWN</b>",
      `Received status: <b>${this.escapeHtml(normalizedStatus || "EMPTY")}</b>`,
      "",
      `Region: <b>${this.escapeHtml(safeContext.regionName || "Unknown region")}</b>`,
      `Region ID: <b>${this.escapeHtml(safeContext.regionId)}</b>`,
      `Source: ${this.escapeHtml(safeContext.source || "api")}`,
      `Time: ${this.escapeHtml(safeContext.time)}`
    ].join("\n");
  }
}

module.exports = {
  AlertMessageCatalog
};
