import { decimal, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const zohoInvoicesTable = pgTable("zoho_invoices", {
  userId: text("user_id").notNull(),
  invoiceId: text("invoice_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerName: text("customer_name").notNull(),
  status: text("status").notNull(),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date"),
  total: decimal("total", { precision: 18, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 18, scale: 2 }).notNull(),
  currencyCode: text("currency_code").notNull(),
  lastModifiedTime: timestamp("last_modified_time", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.invoiceId] }),
]);

export const insertZohoInvoiceSchema = createInsertSchema(zohoInvoicesTable);
export type InsertZohoInvoice = z.infer<typeof insertZohoInvoiceSchema>;
export type ZohoInvoice = typeof zohoInvoicesTable.$inferSelect;