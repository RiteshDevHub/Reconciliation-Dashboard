import { db, zohoConnectionsTable, zohoInvoicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "./zohoOAuth";
import { isDemoZohoConnection } from "./zohoDemo";

const ACCOUNTS_DOMAIN = "https://accounts.zoho.in";

type ZohoConnection = typeof zohoConnectionsTable.$inferSelect;

async function usableAccessToken(connection: ZohoConnection): Promise<string> {
  if (connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
    return decrypt(connection.accessTokenEncrypted);
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Zoho OAuth credentials are required");
  const response = await fetch(`${ACCOUNTS_DOMAIN}/oauth/v2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decrypt(connection.refreshTokenEncrypted),
    }),
  });
  const data = await response.json() as {
    access_token?: string;
    api_domain?: string;
    expires_in?: number;
    error?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(`Zoho access token refresh failed: ${data.error ?? response.status}`);
  }
  await db.update(zohoConnectionsTable).set({
    accessTokenEncrypted: encrypt(data.access_token),
    apiDomain: data.api_domain ?? connection.apiDomain,
    accessTokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    updatedAt: new Date(),
  }).where(eq(zohoConnectionsTable.userId, connection.userId));
  return data.access_token;
}

type ZohoInvoicePayload = {
  invoice_id?: string;
  invoice_number?: string;
  customer_name?: string;
  status?: string;
  date?: string;
  due_date?: string;
  total?: number;
  balance?: number;
  currency_code?: string;
  last_modified_time?: string;
};

export async function syncInvoicesForUser(userId: string): Promise<{ syncedCount: number; syncedAt: Date }> {
  const [connection] = await db.select().from(zohoConnectionsTable)
    .where(eq(zohoConnectionsTable.userId, userId)).limit(1);
  if (!connection?.organizationId) throw new Error("ZOHO_NOT_CONNECTED");

  if (isDemoZohoConnection(connection.apiDomain)) {
    const syncedAt = new Date();
    const invoices = await db.select({ invoiceId: zohoInvoicesTable.invoiceId })
      .from(zohoInvoicesTable)
      .where(eq(zohoInvoicesTable.userId, userId));
    await db.update(zohoInvoicesTable).set({ syncedAt })
      .where(eq(zohoInvoicesTable.userId, userId));
    return { syncedCount: invoices.length, syncedAt };
  }

  const token = await usableAccessToken(connection);
  const allInvoices: ZohoInvoicePayload[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${connection.apiDomain}/books/v3/invoices`);
    url.searchParams.set("organization_id", connection.organizationId);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "200");
    const response = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const data = await response.json() as {
      invoices?: ZohoInvoicePayload[];
      page_context?: { has_more_page?: boolean };
      message?: string;
    };
    if (!response.ok) throw new Error(`Zoho invoice sync failed: ${data.message ?? response.status}`);
    allInvoices.push(...(data.invoices ?? []));
    hasMore = Boolean(data.page_context?.has_more_page);
    page += 1;
  }

  const syncedAt = new Date();
  for (const invoice of allInvoices) {
    if (!invoice.invoice_id || !invoice.invoice_number || !invoice.date) continue;
    const values = {
      userId,
      invoiceId: invoice.invoice_id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name ?? "Unknown customer",
      status: invoice.status ?? "unknown",
      invoiceDate: invoice.date,
      dueDate: invoice.due_date || null,
      total: String(invoice.total ?? 0),
      balance: String(invoice.balance ?? 0),
      currencyCode: invoice.currency_code ?? "INR",
      lastModifiedTime: invoice.last_modified_time ? new Date(invoice.last_modified_time) : null,
      syncedAt,
    };
    await db.insert(zohoInvoicesTable).values(values).onConflictDoUpdate({
      target: [zohoInvoicesTable.userId, zohoInvoicesTable.invoiceId],
      set: { ...values },
    });
  }

  return { syncedCount: allInvoices.length, syncedAt };
}