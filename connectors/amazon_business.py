"""Amazon Business API connector for fetching orders, invoices, and financial events."""

import logging
import time

import requests

logger = logging.getLogger(__name__)


class AmazonBusinessClient:
    """Client for interacting with Amazon Business via the Selling Partner API."""

    def __init__(self, client_id, client_secret, refresh_token, marketplace_id,
                 auth_url, base_url):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.marketplace_id = marketplace_id
        self.auth_url = auth_url
        self.base_url = base_url.rstrip("/")
        self._access_token = None
        self._token_expiry = 0

    def _get_access_token(self):
        """Obtain or refresh the LWA (Login with Amazon) access token."""
        if self._access_token and time.time() < self._token_expiry:
            return self._access_token

        response = requests.post(
            self.auth_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        self._access_token = data["access_token"]
        # Refresh 60 seconds before actual expiry
        self._token_expiry = time.time() + data.get("expires_in", 3600) - 60
        logger.info("Amazon access token refreshed")
        return self._access_token

    def _headers(self):
        return {
            "x-amz-access-token": self._get_access_token(),
            "Content-Type": "application/json",
        }

    def _request_with_retry(self, method, url, max_retries=3, **kwargs):
        """Make an HTTP request with exponential backoff on rate-limit / server errors."""
        kwargs.setdefault("timeout", 30)
        for attempt in range(max_retries + 1):
            response = requests.request(method, url, **kwargs)
            if response.status_code in (429, 500, 503):
                if attempt < max_retries:
                    wait = 2 ** (attempt + 1)
                    logger.warning(
                        "Amazon API %s (attempt %d/%d), retrying in %ds",
                        response.status_code, attempt + 1, max_retries, wait,
                    )
                    time.sleep(wait)
                    continue
            response.raise_for_status()
            return response.json()
        return None

    # ------------------------------------------------------------------
    # Orders
    # ------------------------------------------------------------------

    def get_orders(self, created_after, created_before=None, order_statuses=None):
        """Fetch orders from the Amazon Orders API.

        Args:
            created_after: ISO 8601 datetime string.
            created_before: Optional ISO 8601 datetime string.
            order_statuses: List of statuses to filter (default: Shipped, Delivered).

        Returns:
            List of order dicts.
        """
        params = {
            "MarketplaceIds": self.marketplace_id,
            "CreatedAfter": created_after,
        }
        if created_before:
            params["CreatedBefore"] = created_before
        if order_statuses:
            params["OrderStatuses"] = ",".join(order_statuses)

        url = f"{self.base_url}/orders/v0/orders"
        data = self._request_with_retry("GET", url, headers=self._headers(), params=params)

        orders = data.get("payload", {}).get("Orders", [])
        next_token = data.get("payload", {}).get("NextToken")

        # Handle pagination
        while next_token:
            page = self._request_with_retry(
                "GET", url,
                headers=self._headers(),
                params={"MarketplaceIds": self.marketplace_id, "NextToken": next_token},
            )
            orders.extend(page.get("payload", {}).get("Orders", []))
            next_token = page.get("payload", {}).get("NextToken")

        logger.info("Fetched %d orders from Amazon", len(orders))
        return orders

    def get_order_items(self, order_id):
        """Fetch line items for a specific order."""
        url = f"{self.base_url}/orders/v0/orders/{order_id}/orderItems"
        data = self._request_with_retry("GET", url, headers=self._headers())
        return data.get("payload", {}).get("OrderItems", [])

    # ------------------------------------------------------------------
    # Financial events (for reconciliation)
    # ------------------------------------------------------------------

    def get_financial_events(self, posted_after, posted_before=None):
        """Fetch financial events for reconciliation.

        Returns shipment events, refund events, and other charge breakdowns.
        """
        params = {"PostedAfter": posted_after}
        if posted_before:
            params["PostedBefore"] = posted_before

        url = f"{self.base_url}/finances/v0/financialEvents"
        data = self._request_with_retry("GET", url, headers=self._headers(), params=params)
        return data.get("payload", {}).get("FinancialEvents", {})

    def get_financial_events_by_order(self, order_id):
        """Fetch financial events for a specific order."""
        url = f"{self.base_url}/finances/v0/orders/{order_id}/financialEvents"
        data = self._request_with_retry("GET", url, headers=self._headers())
        return data.get("payload", {}).get("FinancialEvents", {})

    # ------------------------------------------------------------------
    # Invoices
    # ------------------------------------------------------------------

    def get_invoices(self, date_from, date_to):
        """Fetch invoices from the Amazon Invoicing API."""
        url = f"{self.base_url}/invoices/v0/invoices"
        params = {"dateFrom": date_from, "dateTo": date_to}
        data = self._request_with_retry("GET", url, headers=self._headers(), params=params)
        return data.get("payload", {}).get("Invoices", [])
