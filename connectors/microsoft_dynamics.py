"""Microsoft Dynamics 365 connector for posting reconciliation records.

Supports both Finance & Operations (F&O) and Business Central (BC).
"""

import logging
import time

import msal
import requests

logger = logging.getLogger(__name__)


class DynamicsClient:
    """Client for interacting with Microsoft Dynamics 365 APIs."""

    def __init__(self, tenant_id, client_id, client_secret, resource_url,
                 api_type="finance_operations", bc_company_id=""):
        self.tenant_id = tenant_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.resource_url = resource_url.rstrip("/")
        self.api_type = api_type
        self.bc_company_id = bc_company_id
        self._access_token = None
        self._token_expiry = 0

        self._msal_app = msal.ConfidentialClientApplication(
            self.client_id,
            authority=f"https://login.microsoftonline.com/{self.tenant_id}",
            client_credential=self.client_secret,
        )

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    def _get_access_token(self):
        if self._access_token and time.time() < self._token_expiry:
            return self._access_token

        result = self._msal_app.acquire_token_for_client(
            scopes=[f"{self.resource_url}/.default"]
        )

        if "access_token" not in result:
            raise RuntimeError(
                f"Failed to acquire Dynamics token: {result.get('error_description', result)}"
            )

        self._access_token = result["access_token"]
        self._token_expiry = time.time() + result.get("expires_in", 3600) - 60
        logger.info("Dynamics access token acquired")
        return self._access_token

    def _headers(self):
        return {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0",
        }

    def _request_with_retry(self, method, url, max_retries=3, **kwargs):
        kwargs.setdefault("timeout", 30)
        for attempt in range(max_retries + 1):
            response = requests.request(method, url, **kwargs)
            if response.status_code in (429, 500, 503):
                if attempt < max_retries:
                    wait = 2 ** (attempt + 1)
                    logger.warning(
                        "Dynamics API %s (attempt %d/%d), retrying in %ds",
                        response.status_code, attempt + 1, max_retries, wait,
                    )
                    time.sleep(wait)
                    continue
            response.raise_for_status()
            return response.json() if response.content else {}
        return None

    # ------------------------------------------------------------------
    # Finance & Operations endpoints
    # ------------------------------------------------------------------

    def _fo_url(self, entity):
        return f"{self.resource_url}/data/{entity}"

    def create_vendor_invoice(self, invoice_data):
        """Create a vendor invoice header in Finance & Operations."""
        url = self._fo_url("VendorInvoiceHeaders")
        return self._request_with_retry(
            "POST", url, headers=self._headers(), json=invoice_data
        )

    def create_vendor_invoice_line(self, line_data):
        """Create a vendor invoice line in Finance & Operations."""
        url = self._fo_url("VendorInvoiceLines")
        return self._request_with_retry(
            "POST", url, headers=self._headers(), json=line_data
        )

    def create_journal_entry(self, journal_data):
        """Create a general journal entry in Finance & Operations."""
        url = self._fo_url("GeneralJournalEntries")
        return self._request_with_retry(
            "POST", url, headers=self._headers(), json=journal_data
        )

    def get_vendor_invoices(self, filters=None):
        """Retrieve vendor invoices, optionally filtered by OData $filter."""
        url = self._fo_url("VendorInvoiceHeaders")
        params = {}
        if filters:
            params["$filter"] = filters
        return self._request_with_retry(
            "GET", url, headers=self._headers(), params=params
        )

    # ------------------------------------------------------------------
    # Business Central endpoints
    # ------------------------------------------------------------------

    def _bc_url(self, entity):
        return (
            f"https://api.businesscentral.dynamics.com/v2.0/"
            f"{self.tenant_id}/production/api/v2.0/"
            f"companies({self.bc_company_id})/{entity}"
        )

    def create_purchase_invoice_bc(self, invoice_data):
        """Create a purchase invoice in Business Central."""
        url = self._bc_url("purchaseInvoices")
        return self._request_with_retry(
            "POST", url, headers=self._headers(), json=invoice_data
        )

    def create_purchase_invoice_line_bc(self, invoice_id, line_data):
        """Create a purchase invoice line in Business Central."""
        url = self._bc_url(f"purchaseInvoices({invoice_id})/purchaseInvoiceLines")
        return self._request_with_retry(
            "POST", url, headers=self._headers(), json=line_data
        )

    def get_purchase_invoices_bc(self, filters=None):
        """Retrieve purchase invoices from Business Central."""
        url = self._bc_url("purchaseInvoices")
        params = {}
        if filters:
            params["$filter"] = filters
        return self._request_with_retry(
            "GET", url, headers=self._headers(), params=params
        )

    # ------------------------------------------------------------------
    # Unified interface
    # ------------------------------------------------------------------

    def post_invoice(self, invoice_data, lines=None):
        """Create an invoice using the configured API type (F&O or BC).

        Args:
            invoice_data: Invoice header payload.
            lines: Optional list of line-item payloads.

        Returns:
            Created invoice response.
        """
        if self.api_type == "business_central":
            result = self.create_purchase_invoice_bc(invoice_data)
            invoice_id = result.get("id")
            if lines and invoice_id:
                for line in lines:
                    self.create_purchase_invoice_line_bc(invoice_id, line)
            return result
        else:
            result = self.create_vendor_invoice(invoice_data)
            if lines:
                for line in lines:
                    self.create_vendor_invoice_line(line)
            return result

    def check_duplicate(self, external_ref):
        """Check if an invoice with the given external reference already exists."""
        odata_filter = f"ExternalReference eq '{external_ref}'"
        if self.api_type == "business_central":
            existing = self.get_purchase_invoices_bc(filters=odata_filter)
        else:
            existing = self.get_vendor_invoices(filters=odata_filter)
        records = existing.get("value", [])
        return len(records) > 0
