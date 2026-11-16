import xml.etree.ElementTree as ET
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class PosSecondReceipt(models.Model):
    _name = 'pos.second.receipt'
    _description = 'POS Second Receipt Designs'
    _inherit = ['pos.load.mixin']

    name = fields.Char(string='Design Name', required=True)
    design_receipt = fields.Text(
        string='Second Receipt XML',
        required=True,
        help='Custom QWeb XML template for the second POS receipt.',
    )

    @api.model
    def _load_pos_data_fields(self, config):
        return ['id', 'name', 'design_receipt']

    def action_validate_xml(self):
        """Validates that the Second Receipt XML is well-formed."""
        self.ensure_one()
        if not self.design_receipt:
            raise ValidationError(_("Receipt XML cannot be empty."))
        try:
            ET.fromstring(f"<templates>{self.design_receipt}</templates>")
        except ET.ParseError as err:
            raise ValidationError(_("Invalid XML syntax in Second Receipt Design:\n%s", err)) from err

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Valid XML'),
                'message': _('The Second Receipt XML syntax is valid.'),
                'type': 'success',
                'sticky': False,
            },
        }