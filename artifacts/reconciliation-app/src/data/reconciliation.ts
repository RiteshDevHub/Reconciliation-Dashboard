import { addDays, differenceInDays, isAfter, isBefore, parseISO, parse } from "date-fns";

export type Currency = 'INR' | 'USD';
export type RetainerFrequency = 'Monthly' | 'Quarterly';
export type Country = 'India' | 'US';

export interface Client {
  id: string;
  name: string;
  country: Country;
  retainerFrequency: RetainerFrequency;
  startDate: string; 
  expectedBillingPeriods: string[];
}

export interface Invoice {
  id: string;
  clientId: string;
  number: string;
  billingPeriod: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  amount: number;
  currency: Currency;
}

export interface Payment {
  id: string;
  clientId?: string; 
  bankAccount: string;
  date: string; // YYYY-MM-DD
  reference: string;
  amount: number;
  currency: Currency;
  matchedInvoiceIds: string[]; // which invoices this payment covers
  matchStatus: 'Matched' | 'Partial' | 'Unmatched';
  exceptionReason?: string;
}

// -------------------------------------------------------------
// DUMMY DATA SETUP
// Let's assume current date is "2026-09-25" for prototype logic.
// -------------------------------------------------------------
export const CURRENT_DATE = "2026-09-25";

export const dummyClients: Client[] = [
  // 1. Fully Reconciled
  { id: 'c1', name: 'Acme Technologies', country: 'US', retainerFrequency: 'Monthly', startDate: '2025-01-01', expectedBillingPeriods: ['August 2026'] },
  { id: 'c2', name: 'Kaveri Foods Pvt. Ltd.', country: 'India', retainerFrequency: 'Quarterly', startDate: '2024-06-01', expectedBillingPeriods: ['Q2 2026'] },
  { id: 'c3', name: 'Asteria Cloud Services', country: 'US', retainerFrequency: 'Monthly', startDate: '2026-01-01', expectedBillingPeriods: ['August 2026'] },
  // 2. Partially Paid
  { id: 'c4', name: 'TechNova Inc.', country: 'US', retainerFrequency: 'Monthly', startDate: '2025-05-01', expectedBillingPeriods: ['August 2026', 'September 2026'] },
  { id: 'c5', name: 'Bharat Forge Systems', country: 'India', retainerFrequency: 'Monthly', startDate: '2023-01-01', expectedBillingPeriods: ['August 2026'] },
  // 3. Payment Overdue
  { id: 'c6', name: 'ABC Solutions', country: 'India', retainerFrequency: 'Quarterly', startDate: '2025-02-01', expectedBillingPeriods: ['Q3 2026'] },
  { id: 'c7', name: 'Nexus Logistics', country: 'US', retainerFrequency: 'Monthly', startDate: '2026-03-01', expectedBillingPeriods: ['August 2026'] },
  // 4. Payment Received — Unmatched
  { id: 'c8', name: 'GlobalSoft Inc.', country: 'US', retainerFrequency: 'Monthly', startDate: '2024-11-01', expectedBillingPeriods: ['August 2026'] },
  { id: 'c9', name: 'Zenith Retail Group', country: 'India', retainerFrequency: 'Monthly', startDate: '2025-10-01', expectedBillingPeriods: ['August 2026'] },
  // 5. Invoice Pending
  { id: 'c10', name: 'FinEdge Labs', country: 'US', retainerFrequency: 'Monthly', startDate: '2026-04-01', expectedBillingPeriods: ['September 2026'] },
  { id: 'c11', name: 'Omicron Ventures', country: 'India', retainerFrequency: 'Quarterly', startDate: '2025-08-01', expectedBillingPeriods: ['Q3 2026'] },
  // 6. Upcoming
  { id: 'c12', name: 'DataCore Inc.', country: 'US', retainerFrequency: 'Monthly', startDate: '2026-02-01', expectedBillingPeriods: ['September 2026', 'October 2026'] },
  { id: 'c13', name: 'Crescent AI', country: 'India', retainerFrequency: 'Monthly', startDate: '2025-12-01', expectedBillingPeriods: ['October 2026'] },
  // 7. Exception
  { id: 'c14', name: 'CloudWorks Inc.', country: 'US', retainerFrequency: 'Monthly', startDate: '2026-05-01', expectedBillingPeriods: ['August 2026'] },
  { id: 'c15', name: 'Nova Health Labs', country: 'India', retainerFrequency: 'Monthly', startDate: '2025-09-01', expectedBillingPeriods: ['August 2026'] },
  // Additional Mix
  { id: 'c16', name: 'Vertex Studios', country: 'US', retainerFrequency: 'Monthly', startDate: '2024-03-01', expectedBillingPeriods: ['July 2026', 'August 2026'] },
  { id: 'c17', name: 'Meridian Capital', country: 'US', retainerFrequency: 'Quarterly', startDate: '2023-11-01', expectedBillingPeriods: ['Q2 2026', 'Q3 2026'] },
  { id: 'c18', name: 'Vanguard Systems', country: 'India', retainerFrequency: 'Monthly', startDate: '2026-06-01', expectedBillingPeriods: ['August 2026', 'September 2026'] }
];

export const dummyInvoices: Invoice[] = [
  // Fully Reconciled - Acme
  { id: 'inv-101', clientId: 'c1', number: 'INV-2041', billingPeriod: 'July 2026 Retainer', issueDate: '2026-07-01', dueDate: '2026-07-31', amount: 12000, currency: 'USD' },
  { id: 'inv-102', clientId: 'c1', number: 'INV-2055', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 12000, currency: 'USD' },
  // Fully Reconciled - Kaveri
  { id: 'inv-103', clientId: 'c2', number: 'INV-2010', billingPeriod: 'Q1 2026 Retainer', issueDate: '2026-01-05', dueDate: '2026-02-05', amount: 350000, currency: 'INR' },
  { id: 'inv-104', clientId: 'c2', number: 'INV-2035', billingPeriod: 'Q2 2026 Retainer', issueDate: '2026-04-05', dueDate: '2026-05-05', amount: 350000, currency: 'INR' },
  // Fully Reconciled - Asteria
  { id: 'inv-105', clientId: 'c3', number: 'INV-2051', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 8000, currency: 'USD' },
  
  // Partially Paid - TechNova
  { id: 'inv-106', clientId: 'c4', number: 'INV-2045', billingPeriod: 'July 2026 Retainer', issueDate: '2026-07-01', dueDate: '2026-07-31', amount: 15000, currency: 'USD' },
  { id: 'inv-107', clientId: 'c4', number: 'INV-2060', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 15000, currency: 'USD' },
  { id: 'inv-108', clientId: 'c4', number: 'INV-2072', billingPeriod: 'September 2026 Retainer', issueDate: '2026-09-01', dueDate: '2026-09-20', amount: 15000, currency: 'USD' },
  // Partially Paid - Bharat
  { id: 'inv-125', clientId: 'c5', number: 'INV-2018', billingPeriod: 'May 2026 Retainer', issueDate: '2026-05-01', dueDate: '2026-05-30', amount: 200000, currency: 'INR' },
  { id: 'inv-126', clientId: 'c5', number: 'INV-2029', billingPeriod: 'June 2026 Retainer', issueDate: '2026-06-01', dueDate: '2026-06-30', amount: 200000, currency: 'INR' },
  { id: 'inv-127', clientId: 'c5', number: 'INV-2040', billingPeriod: 'July 2026 Retainer', issueDate: '2026-07-01', dueDate: '2026-07-31', amount: 200000, currency: 'INR' },
  { id: 'inv-109', clientId: 'c5', number: 'INV-2058', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 200000, currency: 'INR' },

  // Payment Overdue - ABC Solutions
  { id: 'inv-110', clientId: 'c6', number: 'INV-2065', billingPeriod: 'Q3 2026 Retainer', issueDate: '2026-08-10', dueDate: '2026-09-10', amount: 450000, currency: 'INR' },
  // Payment Overdue - Nexus Logistics
  { id: 'inv-111', clientId: 'c7', number: 'INV-2050', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-05', dueDate: '2026-09-05', amount: 10000, currency: 'USD' },

  // Unmatched - GlobalSoft (We'll have invoices, but payments won't be mapped)
  { id: 'inv-112', clientId: 'c8', number: 'INV-2081', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-15', dueDate: '2026-09-15', amount: 8000, currency: 'USD' },
  { id: 'inv-113', clientId: 'c8', number: 'INV-2082', billingPeriod: 'Additional Project', issueDate: '2026-08-20', dueDate: '2026-09-20', amount: 4500, currency: 'USD' },
  // Unmatched - Zenith
  { id: 'inv-114', clientId: 'c9', number: 'INV-2059', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 150000, currency: 'INR' },

  // Pending - FinEdge (No invoice for Sept, but expected)
  // Pending - Omicron (No invoice for Q3, but expected)
  // Invoices from past periods to give history:
  { id: 'inv-115', clientId: 'c10', number: 'INV-2042', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 8000, currency: 'USD' }, // Paid

  // Upcoming - DataCore
  { id: 'inv-116', clientId: 'c12', number: 'INV-2088', billingPeriod: 'October 2026 Retainer', issueDate: '2026-09-20', dueDate: '2026-10-05', amount: 15000, currency: 'USD' },
  // Upcoming - Crescent AI
  { id: 'inv-117', clientId: 'c13', number: 'INV-2090', billingPeriod: 'October 2026 Retainer', issueDate: '2026-09-22', dueDate: '2026-10-10', amount: 120000, currency: 'INR' },

  // Exception - CloudWorks
  { id: 'inv-118', clientId: 'c14', number: 'INV-2053', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 20000, currency: 'USD' },
  // Exception - Nova Health
  { id: 'inv-119', clientId: 'c15', number: 'INV-2057', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 180000, currency: 'INR' },

  // Vertex
  { id: 'inv-120', clientId: 'c16', number: 'INV-2038', billingPeriod: 'July 2026 Retainer', issueDate: '2026-07-01', dueDate: '2026-07-31', amount: 25000, currency: 'USD' },
  { id: 'inv-121', clientId: 'c16', number: 'INV-2061', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 25000, currency: 'USD' },
  // Meridian
  { id: 'inv-122', clientId: 'c17', number: 'INV-2022', billingPeriod: 'Q2 2026 Retainer', issueDate: '2026-04-01', dueDate: '2026-05-01', amount: 60000, currency: 'USD' },
  { id: 'inv-123', clientId: 'c17', number: 'INV-2066', billingPeriod: 'Q3 2026 Retainer', issueDate: '2026-07-01', dueDate: '2026-08-01', amount: 60000, currency: 'USD' },
  // Vanguard
  { id: 'inv-124', clientId: 'c18', number: 'INV-2052', billingPeriod: 'August 2026 Retainer', issueDate: '2026-08-01', dueDate: '2026-08-30', amount: 100000, currency: 'INR' },
];

export const dummyPayments: Payment[] = [
  // Fully Reconciled - Acme
  { id: 'pay-1', clientId: 'c1', bankAccount: 'JPMC •••• 9921', date: '2026-07-28', reference: 'WIRE-38291', amount: 12000, currency: 'USD', matchedInvoiceIds: ['inv-101'], matchStatus: 'Matched' },
  { id: 'pay-2', clientId: 'c1', bankAccount: 'JPMC •••• 9921', date: '2026-08-25', reference: 'WIRE-38411', amount: 12000, currency: 'USD', matchedInvoiceIds: ['inv-102'], matchStatus: 'Matched' },
  // Fully Reconciled - Kaveri
  { id: 'pay-3', clientId: 'c2', bankAccount: 'HDFC •••• 7814', date: '2026-01-20', reference: 'IMPS-KA-001', amount: 350000, currency: 'INR', matchedInvoiceIds: ['inv-103'], matchStatus: 'Matched' },
  { id: 'pay-4', clientId: 'c2', bankAccount: 'HDFC •••• 7814', date: '2026-04-22', reference: 'IMPS-KA-002', amount: 350000, currency: 'INR', matchedInvoiceIds: ['inv-104'], matchStatus: 'Matched' },
  // Fully Reconciled - Asteria
  { id: 'pay-5', clientId: 'c3', bankAccount: 'JPMC •••• 9921', date: '2026-08-20', reference: 'WIRE-44910', amount: 8000, currency: 'USD', matchedInvoiceIds: ['inv-105'], matchStatus: 'Matched' },
  
  // Partially Paid - TechNova (Total Inv: 45k, Paid: 35k)
  { id: 'pay-6', clientId: 'c4', bankAccount: 'BoA •••• 3311', date: '2026-07-29', reference: 'WIRE-11200', amount: 15000, currency: 'USD', matchedInvoiceIds: ['inv-106'], matchStatus: 'Matched' },
  { id: 'pay-7', clientId: 'c4', bankAccount: 'BoA •••• 3311', date: '2026-08-28', reference: 'WIRE-11455', amount: 15000, currency: 'USD', matchedInvoiceIds: ['inv-107'], matchStatus: 'Matched' },
  { id: 'pay-8', clientId: 'c4', bankAccount: 'BoA •••• 3311', date: '2026-09-18', reference: 'WIRE-11899', amount: 5000, currency: 'USD', matchedInvoiceIds: ['inv-108'], matchStatus: 'Partial' }, // 10k left
  // Partially Paid - Bharat (monthly retainer history; August remains partially paid)
  { id: 'pay-21', clientId: 'c5', bankAccount: 'ICICI •••• 2309', date: '2026-05-26', reference: 'NEFT-BH-761', amount: 200000, currency: 'INR', matchedInvoiceIds: ['inv-125'], matchStatus: 'Matched' },
  { id: 'pay-22', clientId: 'c5', bankAccount: 'ICICI •••• 2309', date: '2026-06-27', reference: 'NEFT-BH-824', amount: 200000, currency: 'INR', matchedInvoiceIds: ['inv-126'], matchStatus: 'Matched' },
  { id: 'pay-23', clientId: 'c5', bankAccount: 'ICICI •••• 2309', date: '2026-07-28', reference: 'NEFT-BH-906', amount: 200000, currency: 'INR', matchedInvoiceIds: ['inv-127'], matchStatus: 'Matched' },
  { id: 'pay-9', clientId: 'c5', bankAccount: 'ICICI •••• 2309', date: '2026-08-15', reference: 'NEFT-BH-992', amount: 150000, currency: 'INR', matchedInvoiceIds: ['inv-109'], matchStatus: 'Partial' },

  // Payment Overdue - ABC, Nexus (no payments for current open invoices)

  // Unmatched - GlobalSoft (Payments received in bank but not explicitly matched)
  { id: 'pay-10', clientId: 'c8', bankAccount: 'JPMC •••• 9921', date: '2026-09-18', reference: 'WIRE-893421', amount: 12450, currency: 'USD', matchedInvoiceIds: [], matchStatus: 'Unmatched' }, 
  // Unmatched - Zenith
  { id: 'pay-11', clientId: 'c9', bankAccount: 'Axis •••• 4418', date: '2026-09-20', reference: 'IMPS-ZN-01', amount: 150000, currency: 'INR', matchedInvoiceIds: [], matchStatus: 'Unmatched' }, 

  // FinEdge past payment
  { id: 'pay-12', clientId: 'c10', bankAccount: 'JPMC •••• 9921', date: '2026-08-25', reference: 'WIRE-99221', amount: 8000, currency: 'USD', matchedInvoiceIds: ['inv-115'], matchStatus: 'Matched' },
  
  // Exception - CloudWorks (Invoice 20k, Paid 19450, 550 short)
  { id: 'pay-13', clientId: 'c14', bankAccount: 'BoA •••• 3311', date: '2026-08-29', reference: 'WIRE-66778', amount: 19450, currency: 'USD', matchedInvoiceIds: ['inv-118'], matchStatus: 'Partial', exceptionReason: 'Payment received is $550 less than the invoice amount. Possible bank fee or short payment.' },
  // Exception - Nova Health (Duplicate payment or overpayment)
  { id: 'pay-14', clientId: 'c15', bankAccount: 'HDFC •••• 7814', date: '2026-08-20', reference: 'IMPS-NV-11', amount: 180000, currency: 'INR', matchedInvoiceIds: ['inv-119'], matchStatus: 'Matched' },
  { id: 'pay-15', clientId: 'c15', bankAccount: 'HDFC •••• 7814', date: '2026-08-22', reference: 'IMPS-NV-12', amount: 180000, currency: 'INR', matchedInvoiceIds: [], matchStatus: 'Unmatched', exceptionReason: 'Duplicate payment received for same amount 2 days later.' },

  // Vertex Fully Reconciled
  { id: 'pay-16', clientId: 'c16', bankAccount: 'JPMC •••• 9921', date: '2026-07-28', reference: 'WIRE-1002', amount: 25000, currency: 'USD', matchedInvoiceIds: ['inv-120'], matchStatus: 'Matched' },
  { id: 'pay-17', clientId: 'c16', bankAccount: 'JPMC •••• 9921', date: '2026-08-28', reference: 'WIRE-1055', amount: 25000, currency: 'USD', matchedInvoiceIds: ['inv-121'], matchStatus: 'Matched' },
  
  // Meridian - Partially paid
  { id: 'pay-18', clientId: 'c17', bankAccount: 'BoA •••• 3311', date: '2026-04-20', reference: 'WIRE-2001', amount: 60000, currency: 'USD', matchedInvoiceIds: ['inv-122'], matchStatus: 'Matched' },
  { id: 'pay-19', clientId: 'c17', bankAccount: 'BoA •••• 3311', date: '2026-07-25', reference: 'WIRE-2101', amount: 30000, currency: 'USD', matchedInvoiceIds: ['inv-123'], matchStatus: 'Partial' },
  
  // Vanguard - Fully Reconciled
  { id: 'pay-20', clientId: 'c18', bankAccount: 'ICICI •••• 2309', date: '2026-08-29', reference: 'NEFT-VG-882', amount: 100000, currency: 'INR', matchedInvoiceIds: ['inv-124'], matchStatus: 'Matched' }
];

export interface InvoiceWithRemaining extends Invoice {
  amountPaid: number;
  remaining: number;
}

export interface PaymentWithAllocation extends Payment {
  allocatedAmount: number;
  unallocatedAmount: number;
  allocationByInvoice: Record<string, number>;
}

export type ClientStatus = 'Fully reconciled' | 'Partially paid' | 'Payment overdue' | 'Needs matching' | 'Invoice not raised' | 'Upcoming' | 'Exception';

export interface ClientSummary {
  client: Client;
  totalInvoicesCount: number;
  activeInvoicesCount: number;
  totalInvoicedAmount: number;
  totalReceivedAmount: number;
  totalMatchedAmount: number;
  totalUnallocatedAmount: number;
  outstandingAmount: number;
  currency: Currency;
  lastPaymentDate?: string;
  status: ClientStatus;
  statusMessage?: string;
  daysOverdue?: number;
  invoices: InvoiceWithRemaining[];
  payments: PaymentWithAllocation[];
  unmatchedPayments: PaymentWithAllocation[];
}

export function generateClientSummaries(clients: Client[], invoices: Invoice[], payments: Payment[]): ClientSummary[] {
  const currentDate = parseISO(CURRENT_DATE);

  return clients.map(client => {
    const clientInvoices = invoices.filter(i => i.clientId === client.id);
    const clientPayments = payments
      .filter(p => p.clientId === client.id)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    const currency = clientInvoices[0]?.currency || (client.country === 'US' ? 'USD' : 'INR');
    const hasCurrencyMismatch = clientInvoices.some(invoice => invoice.currency !== currency)
      || clientPayments.some(payment => payment.currency !== currency);

    let totalInvoicedAmount = 0;
    let totalReceivedAmount = 0;

    const invoicePayments: Record<string, number> = {};
    const enrichedPayments: PaymentWithAllocation[] = clientPayments.map(p => {
      if (p.currency === currency) totalReceivedAmount += p.amount;
      let remainingPayment = p.amount;
      const allocationByInvoice: Record<string, number> = {};
      if (p.currency !== currency) {
        return { ...p, allocatedAmount: 0, unallocatedAmount: p.amount, allocationByInvoice };
      }
      p.matchedInvoiceIds.forEach(invId => {
        const invoice = clientInvoices.find(candidate => candidate.id === invId);
        if (!invoice || invoice.currency !== p.currency || remainingPayment <= 0) return;
        const invoiceBalance = Math.max(0, invoice.amount - (invoicePayments[invId] || 0));
        const allocation = Math.min(invoiceBalance, remainingPayment);
        invoicePayments[invId] = (invoicePayments[invId] || 0) + allocation;
        allocationByInvoice[invId] = allocation;
        remainingPayment -= allocation;
      });
      return {
        ...p,
        allocatedAmount: p.amount - remainingPayment,
        unallocatedAmount: remainingPayment,
        allocationByInvoice,
      };
    });

    const enrichedInvoices: InvoiceWithRemaining[] = clientInvoices.map(inv => {
      totalInvoicedAmount += inv.amount;
      const amountPaid = invoicePayments[inv.id] || 0;
      return {
        ...inv,
        amountPaid,
        remaining: Math.max(0, inv.amount - amountPaid)
      };
    });

    enrichedInvoices.sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
    enrichedPayments.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    const lastPaymentDate = enrichedPayments[0]?.date;

    const outstandingAmount = enrichedInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
    const totalMatchedAmount = enrichedPayments.reduce((sum, payment) => sum + payment.allocatedAmount, 0);
    const totalUnallocatedAmount = enrichedPayments.reduce((sum, payment) => sum + payment.unallocatedAmount, 0);
    const activeInvoicesCount = enrichedInvoices.filter(invoice => invoice.remaining > 0).length;

    const unmatchedPayments = enrichedPayments.filter(payment => payment.unallocatedAmount > 0);
    const hasExceptions = hasCurrencyMismatch
      || enrichedPayments.some(payment => Boolean(payment.exceptionReason))
      || enrichedPayments.some(payment => payment.matchedInvoiceIds.length > 0 && payment.unallocatedAmount > 0);

    let status: ClientStatus = 'Fully reconciled';
    let statusMessage = 'Fully reconciled';
    let daysOverdue = 0;

    const overdueInvoices = enrichedInvoices.filter(i => i.remaining > 0 && isBefore(parseISO(i.dueDate), currentDate));
    const upcomingInvoices = enrichedInvoices.filter(i => i.remaining > 0 && isAfter(parseISO(i.dueDate), currentDate));
    const hasPendingInvoice = client.expectedBillingPeriods.some(period => !clientInvoices.some(i => i.billingPeriod.includes(period)));

    if (hasExceptions) {
      status = 'Exception';
      statusMessage = hasCurrencyMismatch ? 'Currency mismatch' : 'Reconciliation exception';
    } else if (unmatchedPayments.length > 0) {
      status = 'Needs matching';
      statusMessage = 'Needs matching';
    } else if (overdueInvoices.length > 0) {
      const overdueWithPayments = overdueInvoices.filter(i => i.amountPaid > 0);
      if (overdueWithPayments.length > 0) {
        status = 'Partially paid';
        statusMessage = 'Partially paid';
      } else {
        status = 'Payment overdue';
        statusMessage = 'Payment overdue';
        daysOverdue = Math.max(...overdueInvoices.map(i => differenceInDays(currentDate, parseISO(i.dueDate))));
      }
    } else if (hasPendingInvoice) {
      status = 'Invoice not raised';
      statusMessage = 'Invoice not raised';
    } else if (upcomingInvoices.length > 0 && overdueInvoices.length === 0 && outstandingAmount > 0) {
      status = 'Upcoming';
      statusMessage = 'Upcoming';
    }

    if (enrichedInvoices.length === 0 && hasPendingInvoice) {
      status = 'Invoice not raised';
      statusMessage = 'Invoice not raised';
    }

    return {
      client,
      totalInvoicesCount: clientInvoices.length,
      activeInvoicesCount,
      totalInvoicedAmount,
      totalReceivedAmount,
      totalMatchedAmount,
      totalUnallocatedAmount,
      outstandingAmount,
      currency,
      lastPaymentDate,
      status,
      statusMessage,
      daysOverdue,
      invoices: enrichedInvoices,
      payments: enrichedPayments,
      unmatchedPayments
    };
  });
}
