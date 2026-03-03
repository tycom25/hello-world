# Amazon Business ↔ Microsoft Dynamics Reconciliation Connectors

Connectors that sync Amazon Business transactions (orders, financial events, invoices) into Microsoft Dynamics 365 (Finance & Operations or Business Central).

## Architecture

```
Amazon Business (SP-API)
  ├── Orders API
  ├── Finances API (charge-level reconciliation)
  └── Invoices API
        │
        ▼
  ReconciliationPipeline
  (transform + dedup)
        │
        ▼
Microsoft Dynamics 365
  ├── Finance & Operations (OData)
  └── Business Central (REST API)
```

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure credentials

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
# Edit .env with your Amazon SP-API and Azure AD credentials
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `AMAZON_CLIENT_ID` | Amazon SP-API LWA client ID |
| `AMAZON_CLIENT_SECRET` | Amazon SP-API LWA client secret |
| `AMAZON_REFRESH_TOKEN` | Amazon SP-API LWA refresh token |
| `AMAZON_MARKETPLACE_ID` | Marketplace ID (default: `ATVPDKIKX0DER` for US) |
| `DYNAMICS_TENANT_ID` | Azure AD tenant ID |
| `DYNAMICS_CLIENT_ID` | Azure AD app registration client ID |
| `DYNAMICS_CLIENT_SECRET` | Azure AD app registration client secret |
| `DYNAMICS_RESOURCE_URL` | Dynamics 365 environment URL |
| `DYNAMICS_API_TYPE` | `finance_operations` or `business_central` |

### 3. Prerequisites

- **Amazon**: Register an app in Amazon Developer Console with SP-API access. Requires `Orders`, `Finances` roles.
- **Dynamics**: Register an app in Azure AD with Dynamics 365 API permissions. Grant admin consent.

## Usage

### Sync financial events (charge-level reconciliation)

```bash
# Last 24 hours
python main.py --mode financial_events

# Last 7 days
python main.py --mode financial_events --days 7

# Specific date range
python main.py --mode financial_events --from-date 2025-01-01T00:00:00Z --to-date 2025-01-31T23:59:59Z
```

### Sync orders

```bash
python main.py --mode orders --days 3
```

### Verbose logging

```bash
python main.py --mode financial_events --days 1 -v
```

## Sync Modes

| Mode | API Used | Granularity | Best For |
|------|----------|-------------|----------|
| `financial_events` | Finances API | Charge-level (product, shipping, tax, promo) | Detailed reconciliation |
| `orders` | Orders API | Order + line items | Simpler order-level sync |

## Key Features

- **Idempotency**: Checks for duplicate records by `AmazonOrderId` before posting to Dynamics
- **Retry with backoff**: Automatic retry on 429/500/503 errors with exponential backoff
- **Token caching**: Access tokens are cached and refreshed before expiry
- **Ledger mapping**: Configurable mapping of Amazon charge types to Dynamics ledger accounts
- **Refund handling**: Refund events are automatically synced as negative invoices
- **Pagination**: Automatically follows `NextToken` cursors for large result sets
- **Dual Dynamics support**: Works with both Finance & Operations and Business Central

## Running Tests

```bash
python -m pytest tests/ -v
```

## Project Structure

```
├── config.py                          # Environment-based configuration
├── main.py                            # CLI entry point
├── connectors/
│   ├── __init__.py
│   ├── amazon_business.py             # Amazon SP-API client
│   ├── microsoft_dynamics.py          # Dynamics 365 F&O / BC client
│   └── reconciliation.py             # Transform + sync pipeline
├── tests/
│   └── test_reconciliation.py         # Unit tests
├── requirements.txt
└── .env.example                       # Template for credentials
```
