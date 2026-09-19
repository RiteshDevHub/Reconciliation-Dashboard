import { useState, useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import { 
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  FileSpreadsheet,
  Link2
} from 'lucide-react';
import { useReconciliation } from '../data/ReconciliationContext';
import { AppShell } from '../App';
import { format, parseISO } from 'date-fns';

const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function ReconciliationDetailPage() {
  const [, params] = useRoute('/reconciliation/:clientId');
  const clientId = params?.clientId;
  const { summaries, invoices, payments, matchPayment } = useReconciliation();
  
  const summary = summaries.find(s => s.client.id === clientId);
  
  const [matchingPaymentId, setMatchingPaymentId] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  
  if (!summary) {
    return (
      <AppShell>
        <div className="flex h-[calc(100dvh-72px)] items-center justify-center bg-[#f7f5ef]">
          <div className="text-center text-[#8e959b]">Client not found.</div>
        </div>
      </AppShell>
    );
  }

  const { client, currency } = summary;

  const handleMatch = () => {
    if (matchingPaymentId && selectedInvoiceIds.length > 0) {
      matchPayment(matchingPaymentId, selectedInvoiceIds);
      setMatchingPaymentId(null);
      setSelectedInvoiceIds([]);
    }
  };

  const toggleInvoiceSelection = (invId: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(invId) ? prev.filter(id => id !== invId) : [...prev, invId]
    );
  };

  return (
    <AppShell>
      <div className="flex min-h-[calc(100dvh-72px)] flex-col bg-[#f7f5ef] pb-20">
        
        {/* Header */}
        <div className="border-b border-[#e6e2d8] bg-white px-5 py-6 md:px-10">
          <Link href="/reconciliation" className="mb-4 inline-flex items-center gap-2 text-[12px] font-medium text-[#65707b] hover:text-[#273341]">
            <ArrowLeft size={14} /> Back to Kanban
          </Link>
          
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="display text-[38px] leading-none tracking-tight text-[#26313e]">{client.name}</h1>
              <div className="mt-2 flex items-center gap-3 text-[13px] text-[#7b8490]">
                <span>{client.country} Client</span>
                <span className="h-1 w-1 rounded-full bg-[#d6d6cf]" />
                <span>{client.retainerFrequency} Retainer</span>
                <span className="h-1 w-1 rounded-full bg-[#d6d6cf]" />
                <span>Client since {format(parseISO(client.startDate), 'MMM yyyy')}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-8 rounded-xl border border-[#e4e0d7] bg-[#fbfaf7] p-5 shadow-sm">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#8e959b]">Total Invoiced</span>
                <span className="font-mono text-[18px] text-[#273341]">{formatCurrency(summary.totalInvoicedAmount, currency)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#8e959b]">Total Received</span>
                <span className="font-mono text-[18px] text-[#273341]">{formatCurrency(summary.totalReceivedAmount, currency)}</span>
              </div>
              <div className="flex flex-col gap-1 border-l border-[#e4e0d7] pl-8">
                <span className="text-[11px] uppercase tracking-wider text-[#8e959b]">Outstanding</span>
                <span className={`font-mono text-[18px] font-semibold ${summary.outstandingAmount > 0 ? 'text-[#dc2626]' : 'text-[#19805a]'}`}>
                  {formatCurrency(summary.outstandingAmount, currency)}
                </span>
              </div>
              <div className="flex flex-col gap-1 border-l border-[#e4e0d7] pl-8">
                <span className="text-[11px] uppercase tracking-wider text-[#8e959b]">Invoices / Payments</span>
                <span className="font-mono text-[18px] text-[#273341]">{summary.invoices.length} / {summary.payments.length}</span>
              </div>
              <div className="flex flex-col gap-1 border-l border-[#e4e0d7] pl-8">
                <span className="text-[11px] uppercase tracking-wider text-[#8e959b]">Status</span>
                <span className="font-medium text-[#273341]">{summary.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Pane Layout */}
        <div className="mx-auto mt-8 grid w-full max-w-[1400px] gap-8 px-5 md:px-10 lg:grid-cols-2">
          
          {/* LEFT: INVOICES */}
          <div className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wider text-[#65707b]">
              <FileSpreadsheet size={16} /> Invoices ({summary.invoices.length})
            </h2>
            
            <div className="flex flex-col gap-3">
              {summary.invoices.map(inv => {
                const isPartiallyPaid = inv.amountPaid > 0 && inv.remaining > 0;
                return (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => setExpandedInvoiceId(current => current === inv.id ? null : inv.id)}
                  className={`rounded-xl border p-4 text-left shadow-sm transition-shadow hover:shadow-md ${
                    isPartiallyPaid
                      ? 'border-[#efb4b4] bg-[#fff8f8]'
                      : 'border-[#e4e0d7] bg-white'
                  }`}
                  data-testid={`button-invoice-${inv.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[14px] font-medium text-[#273341]">{inv.number}</span>
                        <span className="rounded bg-[#f0eee7] px-2 py-0.5 text-[10px] text-[#65707b]">{inv.billingPeriod}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-[12px] text-[#8e959b]">
                        <span>Issued: {format(parseISO(inv.issueDate), 'MMM d, yyyy')}</span>
                        <span>Due: {format(parseISO(inv.dueDate), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[15px] font-semibold text-[#273341]">{formatCurrency(inv.amount, inv.currency)}</div>
                      <div className="mt-1 flex items-center justify-end gap-1.5 text-[12px]">
                        {inv.remaining === 0 ? (
                          <span className="flex items-center gap-1 font-medium text-[#19805a]"><CheckCircle2 size={12} /> Paid</span>
                        ) : inv.amountPaid > 0 ? (
                           <span className="flex items-center gap-1 font-medium text-[#c43b3b]"><Clock size={12} /> {formatCurrency(inv.amountPaid, inv.currency)} received · {formatCurrency(inv.remaining, inv.currency)} due</span>
                        ) : (
                          <span className="flex items-center gap-1 font-medium text-[#dc2626]"><AlertTriangle size={12} /> Unpaid</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {expandedInvoiceId === inv.id && (
                    <div className="mt-4 grid gap-3 border-t border-[#efede8] pt-4 text-[12px] sm:grid-cols-2">
                      <div>
                        <div className="text-[#8e959b]">Matched payments</div>
                        <div className="mt-1 font-mono text-[#273341]">
                          {summary.payments.filter(payment => payment.matchedInvoiceIds.includes(inv.id)).map(payment => payment.reference).join(', ') || 'No payment matched'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#8e959b]">Remaining balance</div>
                        <div className={`mt-1 font-mono font-semibold ${inv.remaining > 0 ? 'text-[#dc2626]' : 'text-[#19805a]'}`}>
                          {formatCurrency(inv.remaining, inv.currency)}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
                );
              })}
              {summary.invoices.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#d6d6cf] bg-[#fbfaf7] p-8 text-center text-[13px] text-[#8e959b]">
                  No invoices raised for this client yet.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: PAYMENTS */}
          <div className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wider text-[#65707b]">
              <Link2 size={16} /> Payments Received ({summary.payments.length})
            </h2>
            
            <div className="flex flex-col gap-3">
              {summary.payments.map(pay => {
                const isMatching = matchingPaymentId === pay.id;
                
                return (
                  <div key={pay.id} className={`rounded-xl border ${pay.matchStatus === 'Unmatched' ? 'border-[#2d8cff]/50 bg-[#f5f9fe]' : 'border-[#e4e0d7] bg-white'} p-4 shadow-sm transition-shadow hover:shadow-md`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[14px] font-medium text-[#273341]">{pay.reference}</span>
                          <span className="rounded bg-[#f0eee7] px-2 py-0.5 text-[10px] text-[#65707b]">{pay.bankAccount}</span>
                        </div>
                        <div className="mt-2 text-[12px] text-[#8e959b]">
                          {format(parseISO(pay.date), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[15px] font-semibold text-[#273341]">{formatCurrency(pay.amount, pay.currency)}</div>
                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[12px]">
                          {pay.allocatedAmount > 0 && pay.unallocatedAmount === 0 && pay.matchStatus === 'Matched' ? (
                            <span className="flex items-center gap-1 font-medium text-[#19805a]"><CheckCircle2 size={12} /> Matched</span>
                           ) : pay.allocatedAmount > 0 ? (
                             <span className="flex items-center gap-1 font-medium text-[#e39b4f]"><Clock size={12} /> Partially allocated</span>
                          ) : (
                            <span className="flex items-center gap-1 font-medium text-[#2d8cff]"><HelpCircle size={12} /> Unmatched</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {pay.matchedInvoiceIds.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 border-t border-[#efede8] pt-3 text-[12px] text-[#65707b]">
                        <span className="font-medium">Applied to:</span>
                        {pay.matchedInvoiceIds.map(id => {
                          const inv = summary.invoices.find(i => i.id === id);
                          return <span key={id} className="font-mono">{inv?.number}</span>;
                        })}
                      </div>
                    )}

                    {pay.unallocatedAmount > 0 && pay.allocatedAmount > 0 && (
                      <div className="mt-2 text-[11px] font-medium text-[#a45f16]">
                        {formatCurrency(pay.unallocatedAmount, pay.currency)} remains unallocated
                      </div>
                    )}
                    
                    {pay.exceptionReason && (
                      <div className="mt-3 rounded bg-[#fef2f2] p-3 text-[12px] text-[#dc2626]">
                        <div className="font-semibold">Reconciliation Exception</div>
                        <p className="mt-1 opacity-90">{pay.exceptionReason}</p>
                      </div>
                    )}

                    {pay.matchStatus === 'Unmatched' && !isMatching && (
                      <div className="mt-3 border-t border-[#efede8] pt-3">
                        <button 
                          onClick={() => setMatchingPaymentId(pay.id)}
                          className="text-[12px] font-medium text-[#2d8cff] hover:text-[#1877e4]"
                          data-testid={`button-match-${pay.id}`}
                        >
                          Match payment
                        </button>
                      </div>
                    )}

                    {isMatching && (
                      <div className="mt-4 rounded-lg bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-[#e4e0d7]">
                        <div className="mb-2 text-[12px] font-semibold text-[#273341]">Select invoices to match:</div>
                        <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2">
                          {summary.invoices.filter(i => i.remaining > 0).map(inv => (
                            <label key={inv.id} className="flex cursor-pointer items-center justify-between rounded border border-[#efede8] p-2 hover:bg-[#fbfaf7]">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  checked={selectedInvoiceIds.includes(inv.id)}
                                  onChange={() => toggleInvoiceSelection(inv.id)}
                                  className="rounded border-[#cdd5de] text-[#2d8cff] focus:ring-[#2d8cff]"
                                />
                                <span className="font-mono text-[12px]">{inv.number}</span>
                              </div>
                              <span className="font-mono text-[12px] font-medium">{formatCurrency(inv.remaining, inv.currency)}</span>
                            </label>
                          ))}
                          {summary.invoices.filter(i => i.remaining > 0).length === 0 && (
                            <div className="text-[12px] text-[#8e959b]">No unpaid invoices available.</div>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button 
                            onClick={() => { setMatchingPaymentId(null); setSelectedInvoiceIds([]); }}
                            className="rounded px-3 py-1.5 text-[11px] font-medium text-[#65707b] hover:bg-[#f0eee7]"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleMatch}
                            disabled={selectedInvoiceIds.length === 0}
                            className="rounded bg-[#2d8cff] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#1877e4] disabled:opacity-50"
                            data-testid="button-confirm-match"
                          >
                            Confirm Match
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {summary.payments.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#d6d6cf] bg-[#fbfaf7] p-8 text-center text-[13px] text-[#8e959b]">
                  No payments recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SUMMARY CALCULATION */}
        <div className="mx-auto mt-12 w-full max-w-[1400px] px-5 md:px-10">
          <div className="rounded-2xl border border-[#e4e0d7] bg-white p-6 md:p-8">
            <h3 className="text-[16px] font-semibold text-[#273341]">Reconciliation Summary</h3>
            
            <div className="mt-6 flex flex-col md:flex-row md:items-start md:gap-16">
              <div className="flex flex-col gap-3 font-mono text-[16px]">
                <div className="flex justify-between gap-12">
                  <span className="text-[#65707b]">Total invoiced</span>
                  <span className="text-[#273341]">{formatCurrency(summary.totalInvoicedAmount, currency)}</span>
                </div>
                <div className="flex justify-between gap-12">
                  <span className="text-[#65707b]">Payments matched</span>
                  <span className="text-[#273341]">− {formatCurrency(summary.totalMatchedAmount, currency)}</span>
                </div>
                <div className="flex justify-between gap-12 border-t border-[#273341] pt-3 font-semibold">
                  <span className="text-[#273341]">Outstanding</span>
                  <span className={summary.outstandingAmount > 0 ? 'text-[#dc2626]' : 'text-[#19805a]'}>
                    = {formatCurrency(summary.outstandingAmount, currency)}
                  </span>
                </div>
              </div>

              <div className="mt-8 md:mt-0 md:flex-1">
                {summary.outstandingAmount === 0 && summary.status === 'Fully reconciled' ? (
                  <div className="rounded-xl bg-[#edf9f3] p-5">
                    <div className="flex items-center gap-2 text-[15px] font-semibold text-[#18784e]">
                      <CheckCircle2 size={18} /> Everything is reconciled
                    </div>
                    <p className="mt-2 text-[13px] text-[#21815a]">All due invoices have been matched with payments received.</p>
                  </div>
                ) : (
                  <div>
                    {summary.outstandingAmount > 0 && (
                      <>
                        <h4 className="text-[18px] font-semibold text-[#273341]">
                          {formatCurrency(summary.outstandingAmount, currency)} still to be received
                        </h4>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {summary.invoices.filter(i => i.remaining > 0).map(inv => (
                            <div key={inv.id} className="rounded-lg border border-[#e4e0d7] bg-[#fbfaf7] p-3">
                              <div className="font-mono text-[13px] font-medium text-[#273341]">{inv.number}</div>
                              <div className="mt-1 text-[13px] text-[#dc2626]">{formatCurrency(inv.remaining, currency)} remaining</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {summary.totalUnallocatedAmount > 0 && (
                      <div className="mt-5 rounded-xl border border-[#cfe0f2] bg-[#f5f9fe] p-4">
                        <div className="text-[13px] font-semibold text-[#245e99]">Unallocated bank receipts</div>
                        <p className="mt-1 text-[12px] text-[#52708e]">
                          {formatCurrency(summary.totalUnallocatedAmount, currency)} has been received but is not yet applied to invoices.
                        </p>
                      </div>
                    )}
                    {summary.status === 'Exception' && summary.payments.some(payment => payment.exceptionReason) && (
                      <div className="mt-5 rounded-xl border border-[#f1d0d0] bg-[#fff7f7] p-4">
                        <div className="text-[13px] font-semibold text-[#a62c2c]">Reconciliation exception</div>
                        <p className="mt-1 text-[12px] leading-5 text-[#7b4545]">
                          {summary.payments.find(payment => payment.exceptionReason)?.exceptionReason}
                        </p>
                        <button type="button" className="mt-3 rounded-lg border border-[#e8baba] bg-white px-3 py-2 text-[11px] font-semibold text-[#a62c2c] hover:bg-[#fffafa]">
                          Investigate difference
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
