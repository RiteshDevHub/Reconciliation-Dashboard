import { db, zohoConnectionsTable, zohoInvoicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { encrypt } from "./zohoOAuth";

const DEMO_ORGANIZATION_ID = "clearmatch-demo-books";
const DEMO_ORGANIZATION_NAME = "ClearMatch Demo Books";
const DEMO_API_DOMAIN = "demo://zoho-books";

const demoInvoices = [
  { invoiceId: "demo-in-1001", invoiceNumber: "INV-2026-1001", customerName: "Bharat Forge Systems", status: "paid", invoiceDate: "2026-09-12", dueDate: "2026-10-12", total: "284500.00", balance: "0.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1002", invoiceNumber: "INV-2026-1002", customerName: "Narayana Health Labs", status: "sent", invoiceDate: "2026-09-10", dueDate: "2026-10-10", total: "126780.00", balance: "126780.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1003", invoiceNumber: "INV-2026-1003", customerName: "Aarav Textiles Pvt Ltd", status: "partially_paid", invoiceDate: "2026-09-05", dueDate: "2026-10-05", total: "418250.00", balance: "168250.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1004", invoiceNumber: "INV-2026-1004", customerName: "GreenRoute Logistics", status: "overdue", invoiceDate: "2026-08-02", dueDate: "2026-09-01", total: "93750.00", balance: "93750.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1005", invoiceNumber: "INV-2026-1005", customerName: "Jaipur Home Collective", status: "paid", invoiceDate: "2026-08-28", dueDate: "2026-09-27", total: "67240.00", balance: "0.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1006", invoiceNumber: "INV-2026-1006", customerName: "Indus Cloud Services", status: "draft", invoiceDate: "2026-09-16", dueDate: "2026-10-16", total: "152000.00", balance: "152000.00", currencyCode: "INR" },
  { invoiceId: "demo-us-2001", invoiceNumber: "US-INV-2001", customerName: "Northstar Design Co.", status: "sent", invoiceDate: "2026-09-14", dueDate: "2026-10-14", total: "4850.00", balance: "4850.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2002", invoiceNumber: "US-INV-2002", customerName: "Redwood Analytics Inc.", status: "paid", invoiceDate: "2026-09-08", dueDate: "2026-10-08", total: "7200.00", balance: "0.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2003", invoiceNumber: "US-INV-2003", customerName: "Harbor & Pine Retail", status: "partially_paid", invoiceDate: "2026-08-25", dueDate: "2026-09-24", total: "3650.00", balance: "1250.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2004", invoiceNumber: "US-INV-2004", customerName: "Summit Field Operations", status: "overdue", invoiceDate: "2026-07-30", dueDate: "2026-08-29", total: "11800.00", balance: "11800.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2005", invoiceNumber: "US-INV-2005", customerName: "Bluebird Coffee Roasters", status: "paid", invoiceDate: "2026-08-19", dueDate: "2026-09-18", total: "2975.50", balance: "0.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2006", invoiceNumber: "US-INV-2006", customerName: "Cedar Grove Studios", status: "draft", invoiceDate: "2026-09-18", dueDate: "2026-10-18", total: "5400.00", balance: "5400.00", currencyCode: "USD" },
] as const;

export function isDemoZohoConnection(apiDomain: string): boolean {
  return apiDomain === DEMO_API_DOMAIN;
}

export async function connectDemoZohoForUser(userId: string): Promise<{ organizationId: string; organizationName: string }> {
  const now = new Date();
  await db.insert(zohoConnectionsTable).values({
    userId,
    organizationId: DEMO_ORGANIZATION_ID,
    organizationName: DEMO_ORGANIZATION_NAME,
    apiDomain: DEMO_API_DOMAIN,
    accessTokenEncrypted: encrypt("demo-access-token"),
    refreshTokenEncrypted: encrypt("demo-refresh-token"),
    accessTokenExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
  }).onConflictDoUpdate({
    target: zohoConnectionsTable.userId,
    set: {
      organizationId: DEMO_ORGANIZATION_ID,
      organizationName: DEMO_ORGANIZATION_NAME,
      apiDomain: DEMO_API_DOMAIN,
      accessTokenEncrypted: encrypt("demo-access-token"),
      refreshTokenEncrypted: encrypt("demo-refresh-token"),
      accessTokenExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
      updatedAt: now,
    },
  });

  await db.delete(zohoInvoicesTable).where(eq(zohoInvoicesTable.userId, userId));
  await db.insert(zohoInvoicesTable).values(demoInvoices.map((invoice) => ({
    userId,
    ...invoice,
    lastModifiedTime: now,
    syncedAt: now,
  })));

  return {
    organizationId: DEMO_ORGANIZATION_ID,
    organizationName: DEMO_ORGANIZATION_NAME,
  };
}