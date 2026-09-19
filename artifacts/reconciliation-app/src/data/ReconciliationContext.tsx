import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import { 
  Client, 
  Invoice, 
  Payment, 
  dummyClients, 
  dummyInvoices, 
  dummyPayments,
  generateClientSummaries,
  ClientSummary
} from './reconciliation';

interface ReconciliationContextType {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  summaries: ClientSummary[];
  matchPayment: (paymentId: string, invoiceIds: string[]) => void;
}

const ReconciliationContext = createContext<ReconciliationContextType | null>(null);

export function ReconciliationProvider({ children }: { children: ReactNode }) {
  const [clients] = useState<Client[]>(dummyClients);
  const [invoices] = useState<Invoice[]>(dummyInvoices);
  const [payments, setPayments] = useState<Payment[]>(dummyPayments);

  const summaries = useMemo(() => {
    return generateClientSummaries(clients, invoices, payments);
  }, [clients, invoices, payments]);

  const matchPayment = (paymentId: string, invoiceIds: string[]) => {
    const payment = payments.find(candidate => candidate.id === paymentId);
    const summary = summaries.find(candidate => candidate.client.id === payment?.clientId);
    if (!payment || !summary || invoiceIds.length === 0) return;

    const selectedInvoices = summary.invoices.filter(invoice => invoiceIds.includes(invoice.id));
    const validSelection = selectedInvoices.length === invoiceIds.length
      && selectedInvoices.every(invoice => invoice.currency === payment.currency && invoice.remaining > 0);
    if (!validSelection) return;

    const selectedBalance = selectedInvoices.reduce((total, invoice) => total + invoice.remaining, 0);
    const nextStatus = payment.amount === selectedBalance ? 'Matched' : 'Partial';
    setPayments(prev => prev.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          matchedInvoiceIds: invoiceIds,
          matchStatus: nextStatus,
        };
      }
      return p;
    }));
  };

  return (
    <ReconciliationContext.Provider value={{ clients, invoices, payments, summaries, matchPayment }}>
      {children}
    </ReconciliationContext.Provider>
  );
}

export function useReconciliation() {
  const context = useContext(ReconciliationContext);
  if (!context) {
    throw new Error('useReconciliation must be used within a ReconciliationProvider');
  }
  return context;
}
