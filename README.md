# POS Print Second Receipt & Custom Designs (Odoo 20)

This **Odoo 20** module automatically prints a customizable second receipt after the primary POS receipt, supporting both a configurable built-in template and custom QWeb XML receipt designs.

---

## Features

- **Automatic Second Receipt Printing**: Prints a second receipt right after the main receipt without race conditions.
- **Custom Second Receipt Designs (`pos.second.receipt`)**:
  - Create and manage custom XML templates under **Point of Sale → Configuration → Second Receipt Designs**.
  - Includes 3 ready-to-use templates:
    1. **Design 1: Simplified Summary Receipt** (Items, Quantities, Subtotals, and Total)
    2. **Design 2: Kitchen / Preparation Ticket (No Prices)** (Bold quantities, items, and customer notes without prices)
    3. **Design 3: Customer Pickup Token** (Large order token number at top for customer order collection)
  - Includes a **Validate XML Syntax** button in the backend form view.
- **Built-In Layout Customizer**:
  - Customize the **Second Receipt Title**, **Footer Text**, and toggle **Prices & Total**, **Cashier & Customer**, and **Customer Notes** directly from POS Settings.
- **POS Category Filtering**:
  - Optionally select specific **POS Categories** (e.g., *Kitchen*, *Bakery*, *Bar*) so only items from those categories are printed on the second receipt.
- **Dual Print Methods**:
  - Supports both **Chrome Print Dialog** and **QZ Tray** direct thermal printing.

---

## Configuration

1. Go to **Point of Sale → Configuration → Point of Sale** (or **Settings**).
2. Enable **Second Receipt & Custom Design**.
3. Choose the **Print Method** (*Chrome Print Dialog* or *QZ Tray*) and optional **Only Print for POS Categories**.
4. Either configure the built-in layout toggles or enable **Use Custom XML Design** and pick a template from **Second Receipt Design**.
5. Save your changes.

---

## License

LGPL-3