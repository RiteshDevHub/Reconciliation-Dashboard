import { getAuth } from "@clerk/express";
import { db, zohoConnectionsTable, zohoInvoicesTable } from "@workspace/db";
import { GetZohoConnectionStatusResponse, ListZohoInvoicesResponse, SyncZohoInvoicesResponse } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { createOAuthState, encrypt, getRequestOrigin, safeReturnTo, verifyOAuthState } from "../lib/zohoOAuth";
import { syncInvoicesForUser } from "../lib/zohoBooks";

const router: IRouter = Router();
const ACCOUNTS_DOMAIN = "https://accounts.zoho.in";

function userIdFromRequest(req: Parameters<typeof getAuth>[0]): string | null {
  const auth = getAuth(req);
  return auth.sessionClaims?.userId as string | undefined || auth.userId || null;
}

router.get("/integrations/zoho/status", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [connection] = await db
    .select({
      organizationId: zohoConnectionsTable.organizationId,
      organizationName: zohoConnectionsTable.organizationName,
    })
    .from(zohoConnectionsTable)
    .where(eq(zohoConnectionsTable.userId, userId))
    .limit(1);

  res.json(GetZohoConnectionStatusResponse.parse({
    connected: Boolean(connection),
    organizationId: connection?.organizationId ?? null,
    organizationName: connection?.organizationName ?? null,
  }));
});

router.get("/integrations/zoho/authorize", (req, res): void => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const clientId = process.env.ZOHO_CLIENT_ID;
  if (!clientId) throw new Error("ZOHO_CLIENT_ID is required");
  const origin = getRequestOrigin(req);
  const redirectUri = `${origin}/api/integrations/zoho/callback`;
  const returnTo = safeReturnTo(req.query.returnTo, origin);
  const state = createOAuthState(userId, returnTo);
  const params = new URLSearchParams({
    scope: "ZohoBooks.invoices.READ,ZohoBooks.settings.READ",
    client_id: clientId,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    redirect_uri: redirectUri,
    state,
  });
  res.redirect(`${ACCOUNTS_DOMAIN}/oauth/v2/auth?${params.toString()}`);
});

router.get("/integrations/zoho/callback", async (req, res): Promise<void> => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  if (!code || !state) {
    res.status(400).send("Zoho authorization was not completed.");
    return;
  }

  let verified: ReturnType<typeof verifyOAuthState>;
  try {
    verified = verifyOAuthState(state);
  } catch {
    res.status(400).send("This Zoho authorization request is invalid or has expired.");
    return;
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Zoho OAuth credentials are required");
  const origin = getRequestOrigin(req);
  const redirectUri = `${origin}/api/integrations/zoho/callback`;
  const tokenResponse = await fetch(`${ACCOUNTS_DOMAIN}/oauth/v2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenData = await tokenResponse.json() as {
    access_token?: string;
    refresh_token?: string;
    api_domain?: string;
    expires_in?: number;
    error?: string;
  };
  if (!tokenResponse.ok || !tokenData.access_token || !tokenData.refresh_token || !tokenData.api_domain) {
    req.log.error({ status: tokenResponse.status, error: tokenData.error }, "Zoho token exchange failed");
    res.redirect(`${verified.returnTo}${verified.returnTo.includes("?") ? "&" : "?"}zoho=error`);
    return;
  }

  let organizationId: string | null = null;
  let organizationName: string | null = null;
  const organizationResponse = await fetch(`${tokenData.api_domain}/books/v3/organizations`, {
    headers: { Authorization: `Zoho-oauthtoken ${tokenData.access_token}` },
  });
  if (organizationResponse.ok) {
    const organizationData = await organizationResponse.json() as {
      organizations?: Array<{ organization_id?: string; name?: string }>;
    };
    organizationId = organizationData.organizations?.[0]?.organization_id ?? null;
    organizationName = organizationData.organizations?.[0]?.name ?? null;
  }

  await db.insert(zohoConnectionsTable).values({
    userId: verified.userId,
    organizationId,
    organizationName,
    apiDomain: tokenData.api_domain,
    accessTokenEncrypted: encrypt(tokenData.access_token),
    refreshTokenEncrypted: encrypt(tokenData.refresh_token),
    accessTokenExpiresAt: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000),
  }).onConflictDoUpdate({
    target: zohoConnectionsTable.userId,
    set: {
      organizationId,
      organizationName,
      apiDomain: tokenData.api_domain,
      accessTokenEncrypted: encrypt(tokenData.access_token),
      refreshTokenEncrypted: encrypt(tokenData.refresh_token),
      accessTokenExpiresAt: new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000),
      updatedAt: new Date(),
    },
  });

  try {
    await syncInvoicesForUser(verified.userId);
  } catch (error) {
    req.log.warn({ error }, "Initial Zoho invoice sync failed");
  }

  res.redirect(`${verified.returnTo}${verified.returnTo.includes("?") ? "&" : "?"}zoho=connected`);
});

router.get("/integrations/zoho/invoices", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const invoices = await db.select({
    invoiceId: zohoInvoicesTable.invoiceId,
    invoiceNumber: zohoInvoicesTable.invoiceNumber,
    customerName: zohoInvoicesTable.customerName,
    status: zohoInvoicesTable.status,
    invoiceDate: zohoInvoicesTable.invoiceDate,
    dueDate: zohoInvoicesTable.dueDate,
    total: zohoInvoicesTable.total,
    balance: zohoInvoicesTable.balance,
    currencyCode: zohoInvoicesTable.currencyCode,
    syncedAt: zohoInvoicesTable.syncedAt,
  }).from(zohoInvoicesTable)
    .where(eq(zohoInvoicesTable.userId, userId))
    .orderBy(desc(zohoInvoicesTable.invoiceDate));
  res.json(ListZohoInvoicesResponse.parse(invoices.map((invoice) => ({
    ...invoice,
    syncedAt: invoice.syncedAt.toISOString(),
  }))));
});

router.post("/integrations/zoho/sync", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const result = await syncInvoicesForUser(userId);
    res.json(SyncZohoInvoicesResponse.parse({
      syncedCount: result.syncedCount,
      syncedAt: result.syncedAt.toISOString(),
    }));
  } catch (error) {
    if (error instanceof Error && error.message === "ZOHO_NOT_CONNECTED") {
      res.status(409).json({ error: "Zoho Books is not connected" });
      return;
    }
    throw error;
  }
});

export default router;