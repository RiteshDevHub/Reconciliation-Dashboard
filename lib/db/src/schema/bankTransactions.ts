import { decimal, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankTransactionsTable = pgTable("bank_transactions", {
  userId: text("user_id").notNull(),
  transactionId: text("transaction_id").notNull(),
  accountId: text("account_id").notNull(),
  transactionDate: text("transaction_date").notNull(),
  description: text("description").notNull(),
  debit: decimal("debit", { precision: 18, scale: 2 }).notNull(),
  credit: decimal("credit", { precision: 18, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 18, scale: 2 }).notNull(),
  reference: text("reference").notNull(),
  currencyCode: text("currency_code").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.transactionId] }),
]);

export const insertBankTransactionSchema = createInsertSchema(bankTransactionsTable);
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactionsTable.$inferSelect;