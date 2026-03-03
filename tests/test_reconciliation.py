"""Unit tests for the reconciliation pipeline transform logic."""

import unittest
from unittest.mock import MagicMock

from connectors.reconciliation import ReconciliationPipeline


LEDGER_MAP = {
    "ProductCharges": "600100",
    "Shipping": "600200",
    "Tax": "210100",
    "Promotion": "600300",
    "Other": "600900",
}


class TestReconciliationTransforms(unittest.TestCase):

    def setUp(self):
        self.amazon = MagicMock()
        self.dynamics = MagicMock()
        self.pipeline = ReconciliationPipeline(self.amazon, self.dynamics, LEDGER_MAP)

    def test_classify_charge_product(self):
        assert self.pipeline._classify_charge("ProductCharges") == "600100"

    def test_classify_charge_shipping(self):
        assert self.pipeline._classify_charge("ShippingCharge") == "600200"

    def test_classify_charge_unknown(self):
        assert self.pipeline._classify_charge("SomethingRandom") == "600900"

    def test_transform_shipment_event(self):
        event = {
            "AmazonOrderId": "111-222-333",
            "PostedDate": "2025-01-15T10:00:00Z",
            "ShipmentItemList": [
                {
                    "SellerSKU": "SKU-001",
                    "QuantityShipped": 2,
                    "ItemChargeList": [
                        {
                            "ChargeType": "ProductCharges",
                            "ChargeAmount": {"Amount": "50.00", "CurrencyCode": "USD"},
                        },
                        {
                            "ChargeType": "Shipping",
                            "ChargeAmount": {"Amount": "5.99", "CurrencyCode": "USD"},
                        },
                    ],
                }
            ],
        }

        header, lines = self.pipeline._transform_shipment_event(event)

        assert header["ExternalReference"] == "111-222-333"
        assert header["InvoiceDate"] == "2025-01-15"
        assert header["CurrencyCode"] == "USD"
        assert len(lines) == 2
        assert lines[0]["LedgerAccount"] == "600100"
        assert lines[1]["LedgerAccount"] == "600200"

    def test_transform_order(self):
        order = {
            "AmazonOrderId": "444-555-666",
            "PurchaseDate": "2025-02-01T08:00:00Z",
            "OrderTotal": {"Amount": "100.00", "CurrencyCode": "USD"},
        }
        items = [
            {
                "SellerSKU": "SKU-002",
                "Title": "Widget",
                "QuantityOrdered": 2,
                "ItemPrice": {"Amount": "100.00"},
            }
        ]

        header, lines = self.pipeline._transform_order(order, items)

        assert header["InvoiceAmount"] == 100.0
        assert len(lines) == 1
        assert lines[0]["Quantity"] == 2
        assert lines[0]["UnitPrice"] == 50.0

    def test_sync_skips_duplicates(self):
        self.amazon.get_financial_events.return_value = {
            "ShipmentEventList": [
                {"AmazonOrderId": "DUP-001", "ShipmentItemList": []},
            ],
            "RefundEventList": [],
        }
        self.dynamics.check_duplicate.return_value = True

        stats = self.pipeline.sync_financial_events("2025-01-01T00:00:00Z")

        assert stats["skipped"] == 1
        assert stats["synced"] == 0
        self.dynamics.post_invoice.assert_not_called()


if __name__ == "__main__":
    unittest.main()
