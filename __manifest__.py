{
    'name': 'POS Print Second Receipt & Custom Designs',
    'version': '20.0.2.0.0',
    'category': 'Sales/Point of Sale',
    'summary': 'Automatically print a customizable second POS receipt (Summary, Kitchen Slip, or Custom XML)',
    'description': """
POS Print Second Receipt & Custom Designs (Odoo 20)
===================================================
Automatically prints a second receipt after the main POS receipt:
- Choose between the built-in configurable template or custom XML designs (`pos.second.receipt`).
- Includes 3 pre-built designs: Simplified Summary, Kitchen/Prep Slip (No Prices), and Pickup Token.
- Supports POS Category filtering (e.g. only print kitchen/bakery items on the second receipt).
- Supports both Chrome Print Dialog and QZ Tray direct thermal printing.
    """,
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.access.csv',
        'data/second_receipt_designs_data.xml',
        'views/pos_second_receipt_views.xml',
        'views/pos_config_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_print_second_receipt/static/src/xml/second_receipt.xml',
            'pos_print_second_receipt/static/src/js/second_receipt.js',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}