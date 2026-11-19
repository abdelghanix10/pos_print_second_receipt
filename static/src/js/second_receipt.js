/** @odoo-module */

import { Component, useProps, xml } from "@odoo/owl";
import { PosTicketPrinterPlugin } from "@point_of_sale/app/plugins/pos_ticket_printer_plugin";
import { waitImages } from "@point_of_sale/utils";
import { formatCurrency } from "@web/core/currency";
import { patch } from "@web/core/utils/patch";

const _compiledSecondReceiptCache = new Map();

function normalizeSecondReceiptXmlForOwl3(rawXml) {
  if (!rawXml) {
    return "";
  }
  return rawXml
    .replace(/\bt-esc=/g, "t-out=")
    .replace(/(?<![.\w])(?:this\.)?props\./g, "this.props.")
    .replace(/(?<![.\w])(?:this\.)?env\./g, "this.env.");
}

export class SecondReceipt extends Component {
  static template = "pos_print_second_receipt.SecondReceipt";
  props = useProps();

  get customTemplateComponent() {
    const config = this.props.config;
    if (!config?.is_custom_second_receipt || !config?.second_design_receipt) {
      return null;
    }
    const normalizedXml = normalizeSecondReceiptXmlForOwl3(
      config.second_design_receipt,
    );
    if (_compiledSecondReceiptCache.has(normalizedXml)) {
      return _compiledSecondReceiptCache.get(normalizedXml);
    }
    class CustomSecondReceiptDesign extends Component {
      static template = xml`${normalizedXml}`;
      props = useProps();
    }
    _compiledSecondReceiptCache.set(normalizedXml, CustomSecondReceiptDesign);
    return CustomSecondReceiptDesign;
  }
}

function toArray(collection) {
  if (!collection) {
    return [];
  }
  if (Array.isArray(collection)) {
    return collection;
  }
  if (typeof collection.getAll === "function") {
    return collection.getAll();
  }
  if (typeof collection[Symbol.iterator] === "function") {
    return [...collection];
  }
  return [];
}

function resolveQzService(env) {
  return (
    env?.services?.qz_tray ||
    globalThis.odoo?.loader?.modules?.get?.("@odoo_qz_print/qz_service")?.getQzService?.() ||
    null
  );
}

function wrapSecondReceiptHtml(innerHtml) {
  return `<html id="pos-receipt">
    <head>
      <meta charset="utf-8"/>
      <style>
        body {
          font-family: "Courier New", Courier, monospace;
          font-weight: bold;
          margin: 0;
          padding: 8px;
        }
        table {
          table-layout: fixed;
          width: 100%;
        }
        .pos-receipt-print {
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="pos-receipt-print">${innerHtml}</div>
    </body>
  </html>`;
}

function extractReceiptData(order, plugin) {
  if (!order) {
    return null;
  }

  const config = plugin.config || {};
  const company = config.company_id || {};
  let lines = toArray(
    order.lines || order.line_ids || order.orderlines || order.get_orderlines?.(),
  );

  const filterCategIds = new Set(
    toArray(config.second_receipt_categ_ids).map((c) =>
      c && typeof c === "object" ? c.id : c,
    ),
  );

  if (filterCategIds.size > 0) {
    lines = lines.filter((line) => {
      const product = line.product_id || line.product;
      const prodCategArr = toArray(product?.pos_categ_ids);
      return prodCategArr.some((c) => {
        const cId = c && typeof c === "object" ? c.id : c;
        return filterCategIds.has(cId);
      });
    });
  }

  let orderDate;
  const rawDate = order.date_order || order.creation_date;
  if (typeof order.formatDateOrTime === "function" && order.date_order) {
    orderDate = order.formatDateOrTime("date_order", "datetime");
  } else if (rawDate?.toFormat) {
    orderDate = rawDate.toFormat("yyyy-MM-dd HH:mm:ss");
  } else if (rawDate instanceof Date) {
    const pad = (n) => String(n).padStart(2, "0");
    orderDate = `${rawDate.getFullYear()}-${pad(rawDate.getMonth() + 1)}-${pad(rawDate.getDate())} ${pad(rawDate.getHours())}:${pad(rawDate.getMinutes())}:${pad(rawDate.getSeconds())}`;
  } else if (rawDate) {
    orderDate = String(rawDate);
  } else {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  let totalAmount = 0;
  let totalQty = 0;
  const orderlines = lines.map((line, idx) => {
    let productName = "Unknown Product";
    if (typeof line.getFullProductName === "function") {
      productName = line.getFullProductName();
    } else if (line.full_product_name) {
      productName = line.full_product_name;
    } else if (typeof line.get_full_product_name === "function") {
      productName = line.get_full_product_name();
    } else if (line.product_id?.display_name) {
      productName = line.product_id.display_name;
    } else if (line.product_id?.name) {
      productName = line.product_id.name;
    } else if (line.product_name) {
      productName = line.product_name;
    }

    const qty =
      line.qty ??
      line.quantity ??
      (typeof line.get_quantity === "function" ? line.get_quantity() : 0);
    const price =
      line.price_unit ??
      (typeof line.get_unit_display_price === "function"
        ? line.get_unit_display_price()
        : line.price ?? 0);
    const lineTotal =
      line.price_subtotal_incl ??
      (typeof line.get_display_price === "function"
        ? line.get_display_price()
        : price * qty);
    const customerNote =
      line.customer_note || line.customerNote || line.note || "";

    totalQty += Number(qty || 0);
    totalAmount += Number(lineTotal || 0);
    return {
      id: line.id || line.cid || line.uuid || `line_${idx}`,
      product_name: productName,
      productName,
      qty,
      price,
      line_total: lineTotal,
      customer_note: customerNote,
    };
  });

  const orderName = order.pos_reference || order.name || "Order";
  const shortParts = String(orderName).split("-");
  const shortNumber = shortParts[shortParts.length - 1] || orderName;
  const cashierName =
    order.getCashierName?.() ||
    order.employee_id?.name ||
    order.user_id?.name ||
    "";

  return {
    name: orderName,
    short_number: shortNumber,
    date: orderDate,
    title: config.second_receipt_title || "ORDER COPY",
    company_name: company.name || "",
    cashier: cashierName,
    customer: order.partner_id?.name || "",
    show_prices: config.second_receipt_show_prices !== false,
    show_cashier: config.second_receipt_show_cashier !== false,
    show_notes: config.second_receipt_show_notes !== false,
    footer_text: config.second_receipt_footer_text || "",
    total_qty: totalQty,
    amount_total: totalAmount,
    orderlines,
  };
}

patch(PosTicketPrinterPlugin.prototype, {
  async _generateSecondReceiptIframe(htmlString) {
    const container = document.getElementById("receipt-iframe-container");
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.srcdoc = htmlString;
    container.innerHTML = "";
    container.appendChild(iframe);
    await new Promise((resolve) => (iframe.onload = resolve));
    await waitImages(iframe.contentDocument.body);
    return iframe;
  },

  async printSecondReceiptForOrder(order) {
    if (!this.config?.second_receipt_enabled) {
      return;
    }

    const receiptData = extractReceiptData(order, this);
    if (!receiptData?.orderlines?.length) {
      return;
    }

    const delayMs = Number(this.config.second_receipt_delay_ms ?? 1000);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const currencyId = this.config?.currency_id?.id;
    const fmtCurrency = (amount) => {
      try {
        return currencyId
          ? formatCurrency(amount || 0, currencyId)
          : String(amount || 0);
      } catch {
        return String(amount || 0);
      }
    };

    const componentProps = {
      data: receiptData,
      receipt: receiptData,
      orderlines: receiptData.orderlines,
      config: this.config,
      formatCurrency: fmtCurrency,
    };

    try {
      const innerHtml = await this.getHtmlFromComponent(
        SecondReceipt,
        componentProps,
      );
      const htmlContent = wrapSecondReceiptHtml(innerHtml);
      const printMethod =
        this.config.second_receipt_print_method || "chrome_dialog";

      if (printMethod === "qz_tray") {
        await this._printSecondReceiptWithQZTray(htmlContent);
      } else {
        const iframe = await this._generateSecondReceiptIframe(htmlContent);
        await this.printWithFallback({ iframe, webFallback: true });
      }
    } catch (e) {
      console.error("[SecondReceipt] Print error:", e);
    }
  },

  async _printSecondReceiptWithQZTray(htmlContent) {
    try {
      const qzService = resolveQzService(this.env);
      if (!qzService) {
        const iframe = await this._generateSecondReceiptIframe(htmlContent);
        await this.printWithFallback({ iframe, webFallback: true });
        return;
      }

      const printerName = await qzService.getDefaultPrinter();
      await qzService.print(printerName, htmlContent, "pixel", {});
    } catch (error) {
      console.error("[SecondReceipt] QZ Tray print error:", error);
      try {
        const iframe = await this._generateSecondReceiptIframe(htmlContent);
        await this.printWithFallback({ iframe, webFallback: true });
      } catch (fallbackError) {
        console.error("[SecondReceipt] Fallback print failed:", fallbackError);
      }
    }
  },

  async printOrderReceipt(options = {}) {
    const result = await super.printOrderReceipt(options);
    await this.printSecondReceiptForOrder(options.order);
    return result;
  },
});
