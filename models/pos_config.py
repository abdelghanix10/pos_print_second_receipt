from odoo import fields, models


class PosConfig(models.Model):
    _inherit = 'pos.config'

    second_receipt_enabled = fields.Boolean(
        string='Enable Second Receipt',
        default=True,
        help='Enable automatic printing of a second receipt after the main receipt.',
    )
    second_receipt_print_method = fields.Selection(
        selection=[
            ('chrome_dialog', 'Chrome Print Dialog'),
            ('qz_tray', 'QZ Tray'),
        ],
        string='Second Receipt Print Method',
        default='chrome_dialog',
        help='Chrome Print Dialog opens browser preview; QZ Tray prints directly to the default thermal printer.',
    )
    second_receipt_delay_ms = fields.Integer(
        string='Print Delay (ms)',
        default=1000,
        help='Delay in milliseconds between the first and second receipt print jobs.',
    )

    # Custom XML Design selection
    is_custom_second_receipt = fields.Boolean(
        string='Use Custom XML Design',
        default=False,
        help='Use a custom XML template from Second Receipt Designs instead of the standard layout.',
    )
    second_receipt_design_id = fields.Many2one(
        'pos.second.receipt',
        string='Second Receipt Design',
        help='Select the custom XML design for the second receipt.',
    )
    second_design_receipt = fields.Text(
        related='second_receipt_design_id.design_receipt',
        string='Second Receipt XML',
    )

    # Built-in Customizer Options
    second_receipt_title = fields.Char(
        string='Second Receipt Title',
        default='ORDER COPY',
        help='Header title displayed at the top of the second receipt.',
    )
    second_receipt_show_prices = fields.Boolean(
        string='Show Prices & Total',
        default=True,
        help='Disable this for Kitchen / Prep tickets where prices should not be shown.',
    )
    second_receipt_show_cashier = fields.Boolean(
        string='Show Cashier & Customer',
        default=True,
    )
    second_receipt_show_notes = fields.Boolean(
        string='Show Customer Notes',
        default=True,
    )
    second_receipt_footer_text = fields.Char(
        string='Second Receipt Footer',
        default='',
    )
    second_receipt_categ_ids = fields.Many2many(
        'pos.category',
        'pos_config_second_receipt_categ_rel',
        'config_id',
        'categ_id',
        string='Only Print for POS Categories',
        help='Leave empty to print all order lines, or select specific POS categories (e.g. Kitchen/Bakery) to include on the second receipt.',
    )