import { getAuth } from "@clerk/express";
import { bankAccountsTable, bankTransactionsTable, db, zohoConnectionsTable } from "@workspace/db";
import {
  GetBankConnectionStatusResponse,
  ImportDemoBankTransactionsResponse,
  ConnectDemoBankAccountBody,
  ConnectDemoBankAccountResponse,
  ListBankTransactionsResponse,
} from "@workspace/api-zod";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

function userIdFromRequest(req: Parameters<typeof getAuth>[0]): string | null {
  const auth = getAuth(req);
  return auth.sessionClaims?.userId as string | undefined || auth.userId || null;
}

const demoAccounts = {
  hdfc: { accountId: "demo-hdfc-4821", institutionName: "HDFC Bank", last4: "4821", currentBalance: "1846250.75" },
  icici: { accountId: "demo-icici-7392", institutionName: "ICICI Bank", last4: "7392", currentBalance: "927840.20" },
} as const;

async function hasZohoConnection(userId: string): Promise<boolean> {
  const [connection] = await db.select({ userId: zohoConnectionsTable.userId })
    .from(zohoConnectionsTable)
    .where(eq(zohoConnectionsTable.userId, userId))
    .limit(1);
  return Boolean(connection);
}

function accountResponse(account: typeof bankAccountsTable.$inferSelect) {
  return {
    accountId: account.accountId,
    provider: account.provider,
    institutionId: account.institutionId,
    institutionName: account.institutionName,
    accountType: account.accountType,
    last4: account.last4,
    currentBalance: account.currentBalance,
    currencyCode: account.currencyCode,
    status: account.status,
    lastSyncedAt: account.lastSyncedAt.toISOString(),
    importCompleted: account.importCompleted,
    importedTransactionCount: account.importedTransactionCount,
  };
}

router.get("/integrations/banks/status", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const accounts = await db.select().from(bankAccountsTable)
    .where(eq(bankAccountsTable.userId, userId))
    .orderBy(bankAccountsTable.connectedAt);
  const importedTransactionCount = accounts.reduce((total, account) => total + account.importedTransactionCount, 0);
  res.json(GetBankConnectionStatusResponse.parse({
    connected: accounts.length > 0,
    onboardingComplete: accounts.some((account) => account.importCompleted),
    importedTransactionCount,
    accounts: accounts.map(accountResponse),
  }));
});

router.post("/integrations/banks/demo/accounts", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!await hasZohoConnection(userId)) {
    res.status(409).json({ error: "Connect Zoho Books before connecting a bank account" });
    return;
  }
  const parsed = ConnectDemoBankAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a supported demo bank" });
    return;
  }
  const demo = demoAccounts[parsed.data.institutionId];
  const now = new Date();
  const [account] = await db.insert(bankAccountsTable).values({
    userId,
    accountId: demo.accountId,
    provider: "demo",
    institutionId: parsed.data.institutionId,
    institutionName: demo.institutionName,
    accountType: "Current Account",
    last4: demo.last4,
    currentBalance: demo.currentBalance,
    currencyCode: "INR",
    status: "connected",
    lastSyncedAt: now,
  }).onConflictDoUpdate({
    target: [bankAccountsTable.userId, bankAccountsTable.accountId],
    set: { status: "connected", lastSyncedAt: now, currentBalance: demo.currentBalance },
  }).returning();
  res.json(ConnectDemoBankAccountResponse.parse(accountResponse(account)));
});

router.delete("/integrations/banks/accounts/:accountId", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const accountId = Array.isArray(req.params.accountId) ? req.params.accountId[0] : req.params.accountId;
  const deleted = await db.transaction(async (tx) => {
    await tx.delete(bankTransactionsTable)
      .where(and(eq(bankTransactionsTable.userId, userId), eq(bankTransactionsTable.accountId, accountId)));
    return tx.delete(bankAccountsTable)
      .where(and(eq(bankAccountsTable.userId, userId), eq(bankAccountsTable.accountId, accountId)))
      .returning({ accountId: bankAccountsTable.accountId });
  });
  if (!deleted.length) {
    res.status(404).json({ error: "Bank account not found" });
    return;
  }
  res.status(204).send();
});

const sampleTransactions = [
  { transactionId: "txn-001", accountId: "demo-hdfc-4821", transactionDate: "2026-09-18", description: "NEFT REDWOOD ANALYTICS INC", debit: "0.00", credit: "1429080.00", balance: "1846250.75", reference: "N260918482109", currencyCode: "INR" },
  { transactionId: "txn-002", accountId: "demo-hdfc-4821", transactionDate: "2026-09-17", description: "IMPS NARAYANA HEALTH LABS", debit: "0.00", credit: "284500.00", balance: "417170.75", reference: "IMPS6259170412", currencyCode: "INR" },
  { transactionId: "txn-003", accountId: "demo-hdfc-4821", transactionDate: "2026-09-16", description: "AWS INDIA CLOUD SERVICES", debit: "86420.00", credit: "0.00", balance: "132670.75", reference: "SIHDFC26091688", currencyCode: "INR" },
  { transactionId: "txn-004", accountId: "demo-hdfc-4821", transactionDate: "2026-09-15", description: "RTGS AARAV TEXTILES PVT LTD", debit: "0.00", credit: "350000.00", balance: "219090.75", reference: "HDFCR520260915", currencyCode: "INR" },
  { transactionId: "txn-005", accountId: "demo-hdfc-4821", transactionDate: "2026-09-14", description: "SALARY TRANSFER SEPTEMBER", debit: "612000.00", credit: "0.00", balance: "-130909.25", reference: "SAL260914PCT", currencyCode: "INR" },
  { transactionId: "txn-006", accountId: "demo-hdfc-4821", transactionDate: "2026-09-12", description: "NEFT INDUS LEGAL SERVICES", debit: "0.00", credit: "367240.00", balance: "481090.75", reference: "N260912367240", currencyCode: "INR" },
  { transactionId: "txn-007", accountId: "demo-icici-7392", transactionDate: "2026-09-18", description: "WIRE HARBOR AND PINE RETAIL", debit: "0.00", credit: "697200.00", balance: "927840.20", reference: "ICICIUS26091879", currencyCode: "INR" },
  { transactionId: "txn-008", accountId: "demo-icici-7392", transactionDate: "2026-09-16", description: "GOOGLE WORKSPACE INDIA", debit: "38640.00", credit: "0.00", balance: "230640.20", reference: "ICICISI160926", currencyCode: "INR" },
  { transactionId: "txn-009", accountId: "demo-icici-7392", transactionDate: "2026-09-11", description: "WIRE BLUEBIRD COFFEE ROASTERS", debit: "0.00", credit: "747930.00", balance: "269280.20", reference: "ICICIUS26091175", currencyCode: "INR" },
  { transactionId: "txn-010", accountId: "demo-icici-7392", transactionDate: "2026-09-09", description: "TDS PAYMENT GOVERNMENT OF INDIA", debit: "142500.00", credit: "0.00", balance: "-478649.80", reference: "CIN2609091425", currencyCode: "INR" },
] as const;

type DemoTransaction = {
  transactionId: string;
  accountId: string;
  transactionDate: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  reference: string;
  currencyCode: string;
};

function buildDemoTransactions(accounts: Array<typeof bankAccountsTable.$inferSelect>): Array<{ accountId: string; transactions: DemoTransaction[] }> {
  const totalCount = 1284;
  const baseCount = Math.floor(totalCount / accounts.length);
  const debitDescriptions = [
    "AWS INDIA CLOUD SERVICES",
    "GOOGLE WORKSPACE INDIA",
    "SALARY TRANSFER",
    "TDS PAYMENT GOVERNMENT OF INDIA",
    "OFFICE RENT BENGALURU",
    "SOFTWARE SUBSCRIPTION PAYMENT",
  ];
  const creditDescriptions = [
    "NEFT CLIENT PROJECT PAYMENT",
    "RTGS WEBSITE DEVELOPMENT MILESTONE",
    "WIRE MOBILE APP DEVELOPMENT",
    "IMPS SOFTWARE SUPPORT RETAINER",
    "NEFT PRODUCT DESIGN SERVICES",
  ];

  return accounts.map((account, accountIndex) => {
    const targetCount = baseCount + (accountIndex === 0 ? totalCount % accounts.length : 0);
    const accountSamples = sampleTransactions.filter((item) => item.accountId === account.accountId);
    const transactions: DemoTransaction[] = [];
    let rollingBalance = Number(account.currentBalance);

    for (let index = 0; index < targetCount; index += 1) {
      const sample = accountSamples[index];
      if (sample) {
        transactions.push({ ...sample, transactionId: `${account.accountId}-seed-${index + 1}` });
        rollingBalance = Number(sample.balance);
        continue;
      }

      const isCredit = index % 3 === 0;
      const amount = isCredit
        ? 45000 + ((index * 7919) % 480000)
        : 2500 + ((index * 3571) % 165000);
      rollingBalance = isCredit ? rollingBalance - amount : rollingBalance + amount;
      const date = new Date(Date.UTC(2026, 8, 18));
      date.setUTCDate(date.getUTCDate() - (index % 240));
      const datePart = date.toISOString().slice(0, 10);

      transactions.push({
        transactionId: `${account.accountId}-txn-${String(index + 1).padStart(4, "0")}`,
        accountId: account.accountId,
        transactionDate: datePart,
        description: isCredit
          ? creditDescriptions[index % creditDescriptions.length]
          : debitDescriptions[index % debitDescriptions.length],
        debit: isCredit ? "0.00" : amount.toFixed(2),
        credit: isCredit ? amount.toFixed(2) : "0.00",
        balance: rollingBalance.toFixed(2),
        reference: `${account.institutionId.toUpperCase()}${datePart.replaceAll("-", "")}${String(index + 1).padStart(5, "0")}`,
        currencyCode: "INR",
      });
    }

    return { accountId: account.accountId, transactions };
  });
}

router.post("/integrations/banks/import", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!await hasZohoConnection(userId)) {
    res.status(409).json({ error: "Connect Zoho Books before importing bank transactions" });
    return;
  }
  const accounts = await db.select().from(bankAccountsTable).where(eq(bankAccountsTable.userId, userId));
  if (!accounts.length) {
    res.status(409).json({ error: "Connect a bank account first" });
    return;
  }
  const now = new Date();
  const generatedByAccount = buildDemoTransactions(accounts);
  await db.transaction(async (tx) => {
    await tx.delete(bankTransactionsTable).where(eq(bankTransactionsTable.userId, userId));
    const allTransactions = generatedByAccount.flatMap(({ transactions }) =>
      transactions.map((transaction) => ({ userId, ...transaction, importedAt: now })),
    );
    for (let index = 0; index < allTransactions.length; index += 200) {
      await tx.insert(bankTransactionsTable).values(allTransactions.slice(index, index + 200));
    }
    for (const generated of generatedByAccount) {
      await tx.update(bankAccountsTable).set({
        importCompleted: true,
        importedTransactionCount: generated.transactions.length,
        lastSyncedAt: now,
      }).where(and(eq(bankAccountsTable.userId, userId), eq(bankAccountsTable.accountId, generated.accountId)));
    }
  });
  const importedCount = generatedByAccount.reduce((total, generated) => total + generated.transactions.length, 0);
  res.json(ImportDemoBankTransactionsResponse.parse({ importedCount, importedAt: now.toISOString() }));
});

router.get("/integrations/banks/transactions", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const transactions = await db.select({
    transactionId: bankTransactionsTable.transactionId,
    accountId: bankTransactionsTable.accountId,
    transactionDate: bankTransactionsTable.transactionDate,
    description: bankTransactionsTable.description,
    debit: bankTransactionsTable.debit,
    credit: bankTransactionsTable.credit,
    balance: bankTransactionsTable.balance,
    reference: bankTransactionsTable.reference,
    currencyCode: bankTransactionsTable.currencyCode,
  }).from(bankTransactionsTable)
    .where(eq(bankTransactionsTable.userId, userId))
    .orderBy(desc(bankTransactionsTable.transactionDate));
  res.json(ListBankTransactionsResponse.parse(transactions));
});

export default router;