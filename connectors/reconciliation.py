"""Reconciliation pipeline that syncs Amazon Business data into Microsoft Dynamics."""

import logging
from datetime import datetime

from connectors.amazon_business import AmazonBusinessClient
from connectors.microsoft_dynamics import DynamicsClient

logger = logging.getLogger(__name__)


class ReconciliationPipeline:
    """Orchestrates the flow: Amazon Business -> Transform -> Dynamics 365."""

    def __init__(self, amazon_client: AmazonBusinessClient,
                 dynamics_client: DynamicsClient,
                 ledger_map: dict):
        self.amazon = amazon_client
        self.dynamics = dynamics_client
        self.ledger_map = ledger_map

    # ------------------------------------------------------------------
    # Transform helpers
    # ------------------------------------------------------------------

    def _classify_charge(self, charge_type):
        """Map an Amazon charge type to a ledger account using the configured map."""
        for key, account in self.ledger_map.items():
            if key.lower() in charge_type.lower():
                return account
        return self.ledger_map.get("Other", "600900")

    def _transform_shipment_event(self, event):
        """Convert an Amazon ShipmentEvent into a Dynamics invoice payload."""
        order_id = event.get("AmazonOrderId", "")
        posted_date = event.get("PostedDate", datetime.utcnow().isoformat())

        # Build line items from charge components
        lines = []
        for item in event.get("ShipmentItemList", []):
            for charge in item.get("ItemChargeList", []):
                amount = float(charge.get("ChargeAmount", {}).get("Amount", 0))
                currency = charge.get("ChargeAmount", {}).get("CurrencyCode", "USD")
                charge_type = charge.get("ChargeType", "Other")
                lines.append({
                    "ItemNumber": item.get("SellerSKU", ""),
                    "Description": f"Amazon {charge_type} - Order {order_id}",
                    "Quantity": int(item.get("QuantityShipped", 1)),
                    "UnitPrice": amount,
                    "CurrencyCode": currency,
                    "LedgerAccount": self._classify_charge(charge_type),
                    "ExternalReference": order_id,
                })

        # Sum total for header
        total = sum(line["UnitPrice"] * line["Quantity"] for line in lines)
        currency = lines[0]["CurrencyCode"] if lines else "USD"

        header = {
            "InvoiceAccount": "AMAZON-BUSINESS",
            "InvoiceDate": posted_date[:10],
            "CurrencyCode": currency,
            "InvoiceAmount": total,
            "ExternalReference": order_id,
            "Description": f"Amazon Business Order {order_id}",
        }
        return header, lines

    def _transform_order(self, order, items):
        """Convert an Amazon order + items into a Dynamics invoice payload."""
        order_id = order.get("AmazonOrderId", "")
        order_date = order.get("PurchaseDate", datetime.utcnow().isoformat())
        currency = order.get("OrderTotal", {}).get("CurrencyCode", "USD")
        total = float(order.get("OrderTotal", {}).get("Amount", 0))

        lines = []
        for item in items:
            price = float(item.get("ItemPrice", {}).get("Amount", 0))
            qty = int(item.get("QuantityOrdered", 1))
            lines.append({
                "ItemNumber": item.get("SellerSKU", ""),
                "Description": item.get("Title", ""),
                "Quantity": qty,
                "UnitPrice": price / qty if qty else price,
                "CurrencyCode": currency,
                "LedgerAccount": self._classify_charge("ProductCharges"),
                "ExternalReference": order_id,
            })

        header = {
            "InvoiceAccount": "AMAZON-BUSINESS",
            "InvoiceDate": order_date[:10],
            "CurrencyCode": currency,
            "InvoiceAmount": total,
            "ExternalReference": order_id,
            "Description": f"Amazon Business Order {order_id}",
        }
        return header, lines

    # ------------------------------------------------------------------
    # Pipeline methods
    # ------------------------------------------------------------------

    def sync_financial_events(self, posted_after, posted_before=None):
        """Sync Amazon financial events (charges, refunds) into Dynamics.

        This is the primary reconciliation flow — it uses the Finances API
        which provides charge-level breakdowns.

        Returns:
            dict with counts of synced, skipped, and failed records.
        """
        logger.info("Fetching financial events since %s", posted_after)
        events = self.amazon.get_financial_events(posted_after, posted_before)

        stats = {"synced": 0, "skipped": 0, "failed": 0}

        shipment_events = events.get("ShipmentEventList", [])
        logger.info("Processing %d shipment events", len(shipment_events))

        for event in shipment_events:
            order_id = event.get("AmazonOrderId", "unknown")
            try:
                # Idempotency check
                if self.dynamics.check_duplicate(order_id):
                    logger.info("Skipping duplicate: %s", order_id)
                    stats["skipped"] += 1
                    continue

                header, lines = self._transform_shipment_event(event)
                self.dynamics.post_invoice(header, lines)
                logger.info("Synced order %s to Dynamics", order_id)
                stats["synced"] += 1

            except Exception:
                logger.exception("Failed to sync order %s", order_id)
                stats["failed"] += 1

        # Handle refund events
        refund_events = events.get("RefundEventList", [])
        logger.info("Processing %d refund events", len(refund_events))

        for event in refund_events:
            order_id = event.get("AmazonOrderId", "unknown")
            try:
                header, lines = self._transform_shipment_event(event)
                # Negate amounts for refunds
                header["InvoiceAmount"] = -abs(header["InvoiceAmount"])
                header["Description"] = f"Amazon Refund - Order {order_id}"
                for line in lines:
                    line["UnitPrice"] = -abs(line["UnitPrice"])

                self.dynamics.post_invoice(header, lines)
                logger.info("Synced refund for order %s", order_id)
                stats["synced"] += 1

            except Exception:
                logger.exception("Failed to sync refund for order %s", order_id)
                stats["failed"] += 1

        logger.info("Sync complete: %s", stats)
        return stats

    def sync_orders(self, created_after, created_before=None):
        """Sync Amazon orders into Dynamics as purchase invoices.

        Use this as an alternative to sync_financial_events when you need
        order-level (rather than charge-level) granularity.

        Returns:
            dict with counts of synced, skipped, and failed records.
        """
        logger.info("Fetching orders since %s", created_after)
        orders = self.amazon.get_orders(created_after, created_before)

        stats = {"synced": 0, "skipped": 0, "failed": 0}

        for order in orders:
            order_id = order.get("AmazonOrderId", "unknown")
            try:
                if self.dynamics.check_duplicate(order_id):
                    logger.info("Skipping duplicate order: %s", order_id)
                    stats["skipped"] += 1
                    continue

                items = self.amazon.get_order_items(order_id)
                header, lines = self._transform_order(order, items)
                self.dynamics.post_invoice(header, lines)
                logger.info("Synced order %s to Dynamics", order_id)
                stats["synced"] += 1

            except Exception:
                logger.exception("Failed to sync order %s", order_id)
                stats["failed"] += 1

        logger.info("Order sync complete: %s", stats)
        return stats
