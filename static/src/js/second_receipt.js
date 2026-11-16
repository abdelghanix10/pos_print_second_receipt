/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { Component, xml } from "@odoo/owl";
import { PosStore } from "@point_of_sale/app/services/pos_store";

const _compiledSecondReceiptCache = new Map();

/**
 * Normalizes custom XML for Odoo 20 OWL 3:
 * - Converts `t-esc=` to `t-out=`
 * - Prefixes standalone `props.` and `env.` with `this.`
 */
function normalizeSecondReceiptXmlForOwl3(rawXml) {
  if (!rawXml) return "";
  return rawXml
    .replace(/\bt-esc=/g, "t-out=")
    .replace(/(?<![.\w])props\./g, "this.props.")
    .replace(/(?<![.\w])env\./g, "this.env.");
}

export class SecondReceipt extends Component {
  static template = "pos_print_second_receipt.SecondReceipt";

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
    }
    _compiledSecondReceiptCache.set(normalizedXml, CustomSecondReceiptDesign);
    return CustomSecondReceiptDesign;
  }
}

/**
 * Extracts receipt data from an order object at print time,
 * applying optional POS category filtering if configured.
 */
function extractReceiptData(order, pos) {
  if (!order) {
    return null;
  }

  const config = pos?.config || {};

  // Extract order lines safely across array/collection/iterable structures
  let rawLines = [];
  if (typeof order.get_orderlines === "function") {
    rawLines = order.get_orderlines();
  } else if (order.lines) {
    rawLines = order.lines;
  } else if (order.orderlines) {
    rawLines = order.orderlines;
  }

  let lines = [];
  if (Array.isArray(rawLines)) {
    lines = rawLines;
  } else if (typeof rawLines?.getAll === "function") {
    lines = rawLines.getAll();
  } else if (typeof rawLines?.[Symbol.iterator] === "function") {
    lines = [...rawLines];
  }

  // Optional POS category filter
  const rawFilterCategs = config.second_receipt_categ_ids || [];
  const filterCategIds = new Set(
    (Array.isArray(rawFilterCategs)
      ? rawFilterCategs
      : [...rawFilterCategs]
    ).map((c) => (c && typeof c === "object" ? c.id : c)),
  );

  if (filterCategIds.size > 0) {
    lines = lines.filter((line) => {
      const product = line.product_id || line.product;
      const prodCategs = product?.pos_categ_ids || [];
      const prodCategArr = Array.isArray(prodCategs)
        ? prodCategs
        : [...prodCategs];
      return prodCategArr.some((c) => {
        const cId = c && typeof c === "object" ? c.id : c;
        return filterCategIds.has(cId);
      });
    });
  }

  // Format order date
  let orderDate;
  const rawDate = order.date_order || order.creation_date;
  if (rawDate?.toFormat) {
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
    if (line.full_product_name) {
      productName = line.full_product_name;
    } else if (typeof line.get_full_product_name === "function") {
      productName = line.get_full_product_name();
    } else if (line.product_id?.display_name) {
      productName = line.product_id.display_name;
    } else if (line.product_name) {
      productName = line.product_name;
    }

    const qty =
      typeof line.get_quantity === "function"
        ? line.get_quantity()
        : (line.quantity ?? line.qty ?? 0);

    const price =
      typeof line.get_unit_display_price === "function"
        ? line.get_unit_display_price()
        : (line.price_unit ?? line.price ?? 0);

    const lineTotal =
      typeof line.get_display_price === "function"
        ? line.get_display_price()
        : (line.price_subtotal_incl ?? price * qty);

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

  return {
    name: orderName,
    short_number: shortNumber,
    date: orderDate,
    title: config.second_receipt_title || "ORDER COPY",
    company_name: pos?.company?.name || "",
    cashier: pos?.cashier?.name || pos?.user?.name || "",
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

patch(PosStore.prototype, {
  async printReceipt(options = {}) {
    const order = options.order || this.getOrder?.() || this.selectedOrder;
    const receiptData = extractReceiptData(order, this);

    const result = await super.printReceipt(...arguments);

    if (!this.config.second_receipt_enabled) {
      return result;
    }

    if (
      !receiptData ||
      !receiptData.orderlines ||
      receiptData.orderlines.length === 0
    ) {
      return result;
    }

    const delayMs = Number(this.config.second_receipt_delay_ms ?? 1000);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const componentProps = {
      data: receiptData,
      receipt: receiptData,
      orderlines: receiptData.orderlines,
      config: this.config,
      formatCurrency: this.env.utils.formatCurrency,
    };

    try {
      const printMethod =
        this.config.second_receipt_print_method || "chrome_dialog";
      if (printMethod === "qz_tray") {
        await this.printSecondReceiptWithQZTray(componentProps);
      } else {
        await this.printer.print(SecondReceipt, componentProps, {
          webPrintFallback: true,
        });
      }
    } catch (e) {
      console.error("Second receipt print error:", e);
    }

    return result;
  },

  async printSecondReceiptWithQZTray(componentProps) {
    try {
      const qzService = this.env.services.qz_tray;
      if (!qzService) {
        await this.printer.print(SecondReceipt, componentProps, {
          webPrintFallback: true,
        });
        return;
      }

      let qzLib = qzService.getQZ?.();
      const isActive = qzLib?.websocket?.isActive?.();
      if (!isActive) {
        await qzService.connect();
        qzLib = qzService.getQZ?.();
      }

      if (!qzLib) {
        await this.printer.print(SecondReceipt, componentProps, {
          webPrintFallback: true,
        });
        return;
      }

      const renderer = this.env.services.renderer;
      const receiptHtml = await renderer.toHtml(SecondReceipt, componentProps, {
        addClass: "pos-receipt-print",
      });

      const printerName = await qzService.getDefaultPrinter();
      await qzService.print(printerName, receiptHtml.outerHTML, "pixel");
    } catch (error) {
      console.error("QZ Tray second receipt print error:", error);
      try {
        await this.printer.print(SecondReceipt, componentProps, {
          webPrintFallback: true,
        });
      } catch (fallbackError) {
        console.error("Fallback print also failed:", fallbackError);
      }
    }
  },
});
