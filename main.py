"""Entry point for running the Amazon Business -> Dynamics reconciliation pipeline."""

import argparse
import logging
import sys
from datetime import datetime, timedelta

from config import AMAZON_CONFIG, DYNAMICS_CONFIG, LEDGER_ACCOUNT_MAP
from connectors.amazon_business import AmazonBusinessClient
from connectors.microsoft_dynamics import DynamicsClient
from connectors.reconciliation import ReconciliationPipeline


def setup_logging(verbose=False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def build_pipeline():
    amazon = AmazonBusinessClient(**AMAZON_CONFIG)
    dynamics = DynamicsClient(**DYNAMICS_CONFIG)
    return ReconciliationPipeline(amazon, dynamics, LEDGER_ACCOUNT_MAP)


def main():
    parser = argparse.ArgumentParser(
        description="Sync Amazon Business transactions to Microsoft Dynamics 365"
    )
    parser.add_argument(
        "--mode",
        choices=["financial_events", "orders"],
        default="financial_events",
        help="Sync mode: 'financial_events' for charge-level reconciliation, "
             "'orders' for order-level sync (default: financial_events)",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=1,
        help="Number of days to look back (default: 1)",
    )
    parser.add_argument(
        "--from-date",
        type=str,
        help="Start date in ISO format (overrides --days)",
    )
    parser.add_argument(
        "--to-date",
        type=str,
        help="End date in ISO format (default: now)",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    args = parser.parse_args()
    setup_logging(args.verbose)

    logger = logging.getLogger(__name__)

    date_from = args.from_date or (
        datetime.utcnow() - timedelta(days=args.days)
    ).strftime("%Y-%m-%dT00:00:00Z")
    date_to = args.to_date

    logger.info("Starting %s sync from %s to %s", args.mode, date_from, date_to or "now")

    pipeline = build_pipeline()

    if args.mode == "financial_events":
        stats = pipeline.sync_financial_events(date_from, date_to)
    else:
        stats = pipeline.sync_orders(date_from, date_to)

    logger.info("Results — synced: %d, skipped: %d, failed: %d",
                stats["synced"], stats["skipped"], stats["failed"])

    if stats["failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
