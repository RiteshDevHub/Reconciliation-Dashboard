---
name: Demo banking boundary
description: Product constraint for ClearMatch bank onboarding and transaction imports.
---

ClearMatch's current bank connection flow is explicitly a prototype. It must use simulated institutions, accounts, and transactions, clearly label them as demo data, and never request or imply use of real banking credentials.

**Why:** The prototype is intended to demonstrate reconciliation onboarding safely without representing HDFC, ICICI, or any other institution as genuinely connected.

**How to apply:** Preserve a provider-neutral data boundary so a future Account Aggregator such as Setu can replace the demo provider, but do not weaken the demo labeling or introduce real credential collection without an explicit product decision.

Bank connection is the fourth and final onboarding step, not part of the authenticated dashboard shell. Keep it visually aligned with the standalone Zoho connection screen and reveal dashboard navigation only after transaction import completes.

**Why:** The user confirmed the full flow works well but found dashboard chrome during bank connection misleading because onboarding was not yet complete.

**How to apply:** Changes to `/connect-bank` should retain standalone onboarding chrome, an explicit Zoho-complete → bank-account progression, and the existing dashboard gate.