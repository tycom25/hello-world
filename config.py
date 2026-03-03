"""Configuration for Amazon Business and Microsoft Dynamics connectors."""

import os


AMAZON_CONFIG = {
    "client_id": os.environ.get("AMAZON_CLIENT_ID", ""),
    "client_secret": os.environ.get("AMAZON_CLIENT_SECRET", ""),
    "refresh_token": os.environ.get("AMAZON_REFRESH_TOKEN", ""),
    "marketplace_id": os.environ.get("AMAZON_MARKETPLACE_ID", "ATVPDKIKX0DER"),  # US default
    "auth_url": "https://api.amazon.com/auth/o2/token",
    "base_url": os.environ.get(
        "AMAZON_SP_API_URL", "https://sellingpartnerapi-na.amazon.com"
    ),
}

DYNAMICS_CONFIG = {
    "tenant_id": os.environ.get("DYNAMICS_TENANT_ID", ""),
    "client_id": os.environ.get("DYNAMICS_CLIENT_ID", ""),
    "client_secret": os.environ.get("DYNAMICS_CLIENT_SECRET", ""),
    "resource_url": os.environ.get("DYNAMICS_RESOURCE_URL", ""),
    # For Finance & Operations, use the OData endpoint URL
    # For Business Central, use the API base URL
    "api_type": os.environ.get("DYNAMICS_API_TYPE", "finance_operations"),
    # Business Central specific
    "bc_company_id": os.environ.get("DYNAMICS_BC_COMPANY_ID", ""),
}

# Mapping of Amazon charge types to Dynamics ledger accounts
LEDGER_ACCOUNT_MAP = {
    "ProductCharges": "600100",
    "Shipping": "600200",
    "Tax": "210100",
    "Promotion": "600300",
    "Other": "600900",
}
