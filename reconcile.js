// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Amounts arrive as numbers or as strings like "4,804.15".
// Summed as integer kobo so the result is exact, like Decimal in reconcile.py.
function toKobo(value) {
  const n = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

// txn_id -> { ts, lineNo, event }: the latest attempt for each payment.
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n");
for (let lineNo = 0; lineNo < lines.length; lineNo++) {
  let event;
  try {
    event = JSON.parse(lines[lineNo]);
  } catch {
    continue; // line can't be read
  }
  if (event === null || typeof event !== "object" || Array.isArray(event)) continue;
  const txnId = event.txn_id;
  if (!txnId) continue; // nothing to reconcile against

  // ts is UTC ISO-8601, so it sorts lexicographically; line number breaks ties.
  const attempt = { ts: String(event.ts ?? ""), lineNo, event };
  const current = latest.get(txnId);
  if (!current || attempt.ts > current.ts || (attempt.ts === current.ts && attempt.lineNo > current.lineNo)) {
    latest.set(txnId, attempt);
  }
}

let kobo = 0;
let count = 0;

for (const { event } of latest.values()) {
  if (event.status === "success") {
    kobo += toKobo(event.amount);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(kobo / 100)}`);
}
