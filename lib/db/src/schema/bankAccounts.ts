import { boolean, decimal, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankAccountsTable = pgTable("bank_accounts", {
  userId: text("user_id").notNull(),
  accountId: text("account_id").notNull(),
  provider: text("provider").notNull(),
  institutionId: text("institution_id").notNull(),
  institutionName: text("institution_name").notNull(),
  accountType: text("account_type").notNull(),
  last4: text("last_4").notNull(),
  currentBalance: decimal("current_balance", { precision: 18, scale: 2 }).notNull(),
  currencyCode: text("currency_code").notNull(),
  status: text("status").notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  importCompleted: boolean("import_completed").notNull().default(false),
  importedTransactionCount: integer("imported_transaction_count").notNull().default(0),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.accountId] }),
]);

export const insertBankAccountSchema = createInsertSchema(bankAccountsTable);
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccountsTable.$inferSelect;