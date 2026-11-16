from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    pos_second_receipt_enabled = fields.Boolean(related='pos_config_id.second_receipt_enabled', readonly=False)
    pos_second_receipt_print_method = fields.Selection(related='pos_config_id.second_receipt_print_method', readonly=False)
    pos_second_receipt_delay_ms = fields.Integer(related='pos_config_id.second_receipt_delay_ms', readonly=False)
    pos_is_custom_second_receipt = fields.Boolean(related='pos_config_id.is_custom_second_receipt', readonly=False)
    pos_second_receipt_design_id = fields.Many2one(related='pos_config_id.second_receipt_design_id', readonly=False)
    pos_second_receipt_title = fields.Char(related='pos_config_id.second_receipt_title', readonly=False)
    pos_second_receipt_show_prices = fields.Boolean(related='pos_config_id.second_receipt_show_prices', readonly=False)
    pos_second_receipt_show_cashier = fields.Boolean(related='pos_config_id.second_receipt_show_cashier', readonly=False)
    pos_second_receipt_show_notes = fields.Boolean(related='pos_config_id.second_receipt_show_notes', readonly=False)
    pos_second_receipt_footer_text = fields.Char(related='pos_config_id.second_receipt_footer_text', readonly=False)
    pos_second_receipt_categ_ids = fields.Many2many(related='pos_config_id.second_receipt_categ_ids', readonly=False)