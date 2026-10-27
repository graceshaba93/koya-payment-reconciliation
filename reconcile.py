#!/usr/bin/env python3
"""Payment reconciliation.

Reads payments.jsonl and works out how much money we actually collected.
Run:  python3 reconcile.py
"""
import json
from decimal import Decimal


def to_amount(value):
    """Amounts arrive as numbers or as strings like "4,804.15"."""
    return Decimal(str(value).replace(",", "").strip())


# txn_id -> (ts, line number, event): the latest attempt for each payment.
latest = {}

with open("payments.jsonl") as f:
    for line_no, line in enumerate(f):
        try:
            event = json.loads(line)
        except ValueError:
            continue  # line can't be read
        if not isinstance(event, dict):
            continue
        txn_id = event.get("txn_id")
        if not txn_id:
            continue  # nothing to reconcile against

        # ts is UTC ISO-8601, so it sorts lexicographically; line number breaks ties.
        attempt = (str(event.get("ts", "")), line_no)
        current = latest.get(txn_id)
        if current is None or attempt > current[:2]:
            latest[txn_id] = (attempt[0], attempt[1], event)

total = Decimal(0)
count = 0

for _, _, event in latest.values():
    if event.get("status") == "success":
        total += to_amount(event.get("amount", 0))
        count += 1

with open("expected.txt") as f:
    expected = int(f.read().strip())

if count != expected:
    print(f"Check failed: counted {count} successful payments, expected {expected}.")
    print("Something in the data isn't being handled the way the README describes.")
else:
    print(f"Check passed: {count} successful payments.")
    print(f"Your code: KOYA-{round(total)}")