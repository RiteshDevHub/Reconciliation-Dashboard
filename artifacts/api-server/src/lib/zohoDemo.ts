import { db, zohoConnectionsTable, zohoInvoicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { encrypt } from "./zohoOAuth";

const DEMO_ORGANIZATION_ID = "pixelcraft-technologies-demo";
const DEMO_ORGANIZATION_NAME = "PixelCraft Technologies Pvt Ltd";
const DEMO_API_DOMAIN = "demo://zoho-books";

const demoInvoices = [
  { invoiceId: "demo-in-1001", invoiceNumber: "PCT/26-27/1041", customerName: "Narayana Health Labs", description: "Patient appointment portal — web design and React development", status: "paid", invoiceDate: "2026-09-12", dueDate: "2026-10-12", total: "284500.00", balance: "0.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1002", invoiceNumber: "PCT/26-27/1042", customerName: "GreenRoute Logistics Pvt Ltd", description: "Fleet tracking mobile app — Android and iOS milestone 2", status: "sent", invoiceDate: "2026-09-10", dueDate: "2026-10-10", total: "426780.00", balance: "426780.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1003", invoiceNumber: "PCT/26-27/1038", customerName: "Aarav Textiles Pvt Ltd", description: "B2B ecommerce website and Zoho Inventory integration", status: "partially_paid", invoiceDate: "2026-09-05", dueDate: "2026-10-05", total: "618250.00", balance: "268250.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1004", invoiceNumber: "PCT/26-27/1025", customerName: "Jaipur Home Collective", description: "Shopify storefront redesign and performance optimization", status: "overdue", invoiceDate: "2026-08-02", dueDate: "2026-09-01", total: "193750.00", balance: "193750.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1005", invoiceNumber: "PCT/26-27/1032", customerName: "Indus Legal Services", description: "Client document portal — UX, development, and deployment", status: "paid", invoiceDate: "2026-08-28", dueDate: "2026-09-27", total: "367240.00", balance: "0.00", currencyCode: "INR" },
  { invoiceId: "demo-in-1006", invoiceNumber: "PCT/26-27/1044", customerName: "Saffron Hospitality Group", description: "Hotel booking engine discovery and interface design", status: "draft", invoiceDate: "2026-09-16", dueDate: "2026-10-16", total: "152000.00", balance: "152000.00", currencyCode: "INR" },
  { invoiceId: "demo-us-2001", invoiceNumber: "PCT-US-26091", customerName: "Northstar Design Co.", description: "Multi-tenant project management SaaS — sprint 4", status: "sent", invoiceDate: "2026-09-14", dueDate: "2026-10-14", total: "14850.00", balance: "14850.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2002", invoiceNumber: "PCT-US-26088", customerName: "Redwood Analytics Inc.", description: "Customer analytics dashboard and data visualization", status: "paid", invoiceDate: "2026-09-08", dueDate: "2026-10-08", total: "17200.00", balance: "0.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2003", invoiceNumber: "PCT-US-26079", customerName: "Harbor & Pine Retail", description: "Headless commerce storefront — development milestone 3", status: "partially_paid", invoiceDate: "2026-08-25", dueDate: "2026-09-24", total: "13650.00", balance: "5250.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2004", invoiceNumber: "PCT-US-26071", customerName: "Summit Field Operations", description: "Field service mobile app and offline synchronization", status: "overdue", invoiceDate: "2026-07-30", dueDate: "2026-08-29", total: "21800.00", balance: "21800.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2005", invoiceNumber: "PCT-US-26075", customerName: "Bluebird Coffee Roasters", description: "Subscription commerce website and Stripe integration", status: "paid", invoiceDate: "2026-08-19", dueDate: "2026-09-18", total: "8975.50", balance: "0.00", currencyCode: "USD" },
  { invoiceId: "demo-us-2006", invoiceNumber: "PCT-US-26094", customerName: "Cedar Grove Studios", description: "Creator portfolio platform — product design retainer", status: "draft", invoiceDate: "2026-09-18", dueDate: "2026-10-18", total: "5400.00", balance: "5400.00", currencyCode: "USD" },
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