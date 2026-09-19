import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { 
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  FileSpreadsheet,
  Link2,
  FileText,
  Download,
  ExternalLink,
  Mail,
  X
} from 'lucide-react';
import { useReconciliation } from '../data/ReconciliationContext';
import { AppShell } from '../App';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const RECONCILIATION_FILE = 'Bharat_Forge_Systems_Reconciliation_Aug_2026.xlsx';
const INVOICE_FILE = 'Bharat_Forge_Systems_INV-2058.pdf';

function downloadDocument(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReconciliationDetailPage() {
  const [, params] = useRoute('/reconciliation/:clientId');
  const clientId = params?.clientId;
  const { summaries, invoices, payments, matchPayment } = useReconciliation();
  
  const summary = summaries.find(s => s.client.id === clientId);
  
  const [matchingPaymentId, setMatchingPaymentId] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<{ sheet?: Blob; invoice?: Blob }>({});
  const [preview, setPreview] = useState<'sheet' | 'invoice' | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
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
  const paymentRows = client.id === 'c5' && summary.payments.length > 1
    ? [...summary.payments.slice(1), summary.payments[0]]
    : summary.payments;
  const isBharatForge = client.id === 'c5';
  const outstandingInvoice = summary.invoices.find(invoice => invoice.number === 'INV-2058');
  const invoiceRows = summary.invoices.map(invoice => {
    const matchedPayments = summary.payments.filter(payment => payment.matchedInvoiceIds.includes(invoice.id));
    const paymentReceived = matchedPayments.reduce(
      (total, payment) => total + (payment.allocationByInvoice[invoice.id] || 0),
      0,
    );
    return {
      invoice,
      paymentReceived,
      references: matchedPayments.map(payment => payment.reference).join(', '),
    };
  });
  const emailSubject = 'Bharat Forge Systems — Reconciliation Statement & Outstanding Invoice';
  const emailBody = `Hi Accounts Team,

Please find attached the reconciliation statement for the period May–August 2026 along with the outstanding invoice INV-2058.

Reconciliation summary:
Total invoiced: ${formatCurrency(summary.totalInvoicedAmount, currency)}
Total received: ${formatCurrency(summary.totalReceivedAmount, currency)}
Outstanding: ${formatCurrency(summary.outstandingAmount, currency)}

The outstanding amount of ${formatCurrency(summary.outstandingAmount, currency)} relates to invoice INV-2058 for the August 2026 retainer.

Please let us know if you need any clarification.

Regards,
Ritesh`;

  const createReconciliationSheet = () => {
    const rows = [
      [client.name],
      ['Client Reconciliation Statement'],
      [],
      ['Period', 'May 2026 – August 2026'],
      ['Currency', currency],
      [],
      ['Client', client.name],
      ['Client type', `${client.country} Client`],
      ['Billing', `${client.retainerFrequency} Retainer`],
      [],
      ['Invoice Number', 'Billing Period', 'Invoice Date', 'Due Date', 'Invoice Amount', 'Payment Received', 'Outstanding', 'Payment Status', 'Matched Transaction'],
      ...invoiceRows.map(({ invoice, paymentReceived, references }) => [
        invoice.number,
        invoice.billingPeriod,
        format(parseISO(invoice.issueDate), 'MMM d, yyyy'),
        format(parseISO(invoice.dueDate), 'MMM d, yyyy'),
        invoice.amount,
        paymentReceived,
        invoice.remaining,
        invoice.remaining === 0 ? 'Paid' : paymentReceived > 0 ? 'Partially Paid' : 'Unpaid',
        references || '—',
      ]),
      [],
      ['Summary'],
      ['Total invoiced', summary.totalInvoicedAmount],
      ['Total received', summary.totalReceivedAmount],
      ['Outstanding', summary.outstandingAmount],
      [],
      [`Amount outstanding: ${formatCurrency(summary.outstandingAmount, currency)}`],
      ['Reason', `${formatCurrency(outstandingInvoice?.amountPaid || 0, currency)} received against INV-2058. ${formatCurrency(outstandingInvoice?.remaining || 0, currency)} remains outstanding.`],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ];
    worksheet['!cols'] = [
      { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
      { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 24 },
    ];
    ['E', 'F', 'G'].forEach(column => {
      for (let row = 12; row <= 15; row += 1) {
        const cell = worksheet[`${column}${row}`];
        if (cell) cell.z = '₹#,##0';
      }
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reconciliation');
    const output = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  const createInvoicePdf = () => {
    const invoice = outstandingInvoice;
    const pdf = new jsPDF();
    pdf.setTextColor(39, 51, 65);
    pdf.setFontSize(24);
    pdf.text(client.name, 20, 28);
    pdf.setFontSize(12);
    pdf.setTextColor(101, 112, 123);
    pdf.text('INVOICE', 20, 38);
    pdf.setDrawColor(228, 224, 215);
    pdf.line(20, 46, 190, 46);
    pdf.setTextColor(39, 51, 65);
    pdf.setFontSize(13);
    pdf.text(`Invoice: ${invoice?.number || 'INV-2058'}`, 20, 60);
    pdf.text(`Billing period: ${invoice?.billingPeriod.replace(' Retainer', '') || 'August 2026'}`, 20, 70);
    pdf.text(`Invoice date: ${invoice ? format(parseISO(invoice.issueDate), 'MMMM d, yyyy') : 'August 1, 2026'}`, 20, 80);
    pdf.text(`Due date: ${invoice ? format(parseISO(invoice.dueDate), 'MMMM d, yyyy') : 'August 30, 2026'}`, 20, 90);
    pdf.setFillColor(247, 245, 239);
    pdf.roundedRect(20, 106, 170, 58, 3, 3, 'F');
    pdf.setFontSize(11);
    pdf.setTextColor(101, 112, 123);
    pdf.text('INVOICE AMOUNT', 30, 122);
    pdf.text('PAYMENT RECEIVED', 30, 140);
    pdf.text('BALANCE DUE', 30, 158);
    pdf.setTextColor(39, 51, 65);
    pdf.setFontSize(14);
    pdf.text(`INR ${(invoice?.amount || 0).toLocaleString('en-IN')}`, 145, 122, { align: 'right' });
    pdf.text(`INR ${(invoice?.amountPaid || 0).toLocaleString('en-IN')}`, 145, 140, { align: 'right' });
    pdf.setTextColor(220, 38, 38);
    pdf.text(`INR ${(invoice?.remaining || 0).toLocaleString('en-IN')}`, 145, 158, { align: 'right' });
    pdf.setFontSize(10);
    pdf.setTextColor(120, 130, 140);
    pdf.text('Generated from the existing ClearMatch reconciliation record. No new accounting record was created.', 20, 184);
    return pdf.output('blob');
  };

  const generateDocuments = (kind: 'sheet' | 'invoice' | 'both') => {
    setGeneratedDocuments(current => ({
      ...current,
      ...(kind === 'sheet' || kind === 'both' ? { sheet: createReconciliationSheet() } : {}),
      ...(kind === 'invoice' || kind === 'both' ? { invoice: createInvoicePdf() } : {}),
    }));
    setGenerateMenuOpen(false);
  };

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
              {isBharatForge && (
                <div className="relative mt-5 inline-block">
                  <button
                    type="button"
                    onClick={() => setGenerateMenuOpen(open => !open)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2d8cff] px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_5px_15px_rgba(45,140,255,.18)] hover:bg-[#1877e4]"
                    data-testid="button-generate-documents"
                  >
                    <FileText size={15} /> Generate documents
                  </button>
                  {generateMenuOpen && (
                    <div className="absolute left-0 top-full z-30 mt-2 w-[230px] rounded-xl border border-[#e4e0d7] bg-white p-2 shadow-[0_14px_40px_rgba(39,51,65,.16)]">
                      <button onClick={() => generateDocuments('sheet')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-medium text-[#273341] hover:bg-[#f7f5ef]"><FileSpreadsheet size={15} /> Reconciliation sheet</button>
                      <button onClick={() => generateDocuments('invoice')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] font-medium text-[#273341] hover:bg-[#f7f5ef]"><FileText size={15} /> Invoice</button>
                      <button onClick={() => generateDocuments('both')} className="mt-1 flex w-full items-center gap-3 rounded-lg bg-[#edf5ff] px-3 py-2.5 text-left text-[12px] font-semibold text-[#226fbf] hover:bg-[#e2efff]"><CheckCircle2 size={15} /> Generate both <span className="ml-auto text-[9px] uppercase tracking-wider">Default</span></button>
                    </div>
                  )}
                </div>
              )}
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
              {paymentRows.map(pay => {
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

        {isBharatForge && (generatedDocuments.sheet || generatedDocuments.invoice) && (
          <div className="mx-auto mt-8 w-full max-w-[1400px] px-5 md:px-10">
            <div className="rounded-2xl border border-[#e4e0d7] bg-white p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-[16px] font-semibold text-[#273341]">Documents</h3>
                  <p className="mt-1 text-[12px] text-[#8e959b]">Generated from the current invoice and payment data.</p>
                </div>
                <button onClick={() => { setEmailSent(false); setEmailOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#273341] px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-[#18212b]">
                  <Mail size={15} /> Share with client
                </button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {generatedDocuments.sheet && (
                  <div className="rounded-xl border border-[#e4e0d7] bg-[#fbfaf7] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eaf5ef] text-[#19805a]"><FileSpreadsheet size={17} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-[#273341]">Reconciliation statement</div>
                        <div className="mt-1 truncate font-mono text-[10px] text-[#7b8490]">{RECONCILIATION_FILE}</div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => setPreview('sheet')} className="inline-flex items-center gap-1.5 rounded-md border border-[#dcd8ce] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#52606c] hover:border-[#2d8cff]"><ExternalLink size={12} /> Open</button>
                          <button onClick={() => downloadDocument(generatedDocuments.sheet!, RECONCILIATION_FILE)} className="inline-flex items-center gap-1.5 rounded-md border border-[#dcd8ce] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#52606c] hover:border-[#2d8cff]"><Download size={12} /> Download</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {generatedDocuments.invoice && (
                  <div className="rounded-xl border border-[#e4e0d7] bg-[#fbfaf7] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#fff1f1] text-[#c43b3b]"><FileText size={17} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-[#273341]">INV-2058 — August 2026</div>
                        <div className="mt-1 truncate font-mono text-[10px] text-[#7b8490]">{INVOICE_FILE}</div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => setPreview('invoice')} className="inline-flex items-center gap-1.5 rounded-md border border-[#dcd8ce] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#52606c] hover:border-[#2d8cff]"><ExternalLink size={12} /> Open</button>
                          <button onClick={() => downloadDocument(generatedDocuments.invoice!, INVOICE_FILE)} className="inline-flex items-center gap-1.5 rounded-md border border-[#dcd8ce] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#52606c] hover:border-[#2d8cff]"><Download size={12} /> Download</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17202a]/55 p-4" role="dialog" aria-modal="true">
            <div className="max-h-[90dvh] w-full max-w-[1050px] overflow-y-auto rounded-2xl bg-[#f7f5ef] shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e4e0d7] bg-white px-6 py-4">
                <div>
                  <div className="text-[14px] font-semibold text-[#273341]">{preview === 'sheet' ? 'Reconciliation statement' : 'Invoice INV-2058'}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-[#8e959b]">{preview === 'sheet' ? RECONCILIATION_FILE : INVOICE_FILE}</div>
                </div>
                <button onClick={() => setPreview(null)} className="rounded-lg p-2 text-[#65707b] hover:bg-[#f0eee7]" aria-label="Close preview"><X size={18} /></button>
              </div>
              {preview === 'sheet' ? (
                <div className="p-6">
                  <div className="overflow-x-auto rounded-xl border border-[#dcd8ce] bg-white">
                    <div className="border-b border-[#e4e0d7] p-5">
                      <div className="text-[20px] font-semibold text-[#273341]">{client.name}</div>
                      <div className="mt-1 text-[13px] text-[#65707b]">Client Reconciliation Statement · May 2026 – August 2026 · INR</div>
                    </div>
                    <table className="w-full min-w-[900px] border-collapse text-[11px]">
                      <thead className="bg-[#f0eee7] text-left uppercase tracking-wider text-[#65707b]">
                        <tr>{['Invoice Number', 'Billing Period', 'Invoice Date', 'Due Date', 'Invoice Amount', 'Payment Received', 'Outstanding', 'Status', 'Matched Transaction'].map(label => <th key={label} className="border-b border-[#dcd8ce] px-3 py-3">{label}</th>)}</tr>
                      </thead>
                      <tbody>
                        {invoiceRows.map(({ invoice, paymentReceived, references }) => (
                          <tr key={invoice.id} className="border-b border-[#efede8] last:border-0">
                            <td className="px-3 py-3 font-mono font-semibold">{invoice.number}</td>
                            <td className="px-3 py-3">{invoice.billingPeriod}</td>
                            <td className="px-3 py-3">{format(parseISO(invoice.issueDate), 'MMM d, yyyy')}</td>
                            <td className="px-3 py-3">{format(parseISO(invoice.dueDate), 'MMM d, yyyy')}</td>
                            <td className="px-3 py-3 font-mono">{formatCurrency(invoice.amount, currency)}</td>
                            <td className="px-3 py-3 font-mono">{formatCurrency(paymentReceived, currency)}</td>
                            <td className={`px-3 py-3 font-mono font-semibold ${invoice.remaining > 0 ? 'text-[#dc2626]' : 'text-[#19805a]'}`}>{formatCurrency(invoice.remaining, currency)}</td>
                            <td className="px-3 py-3">{invoice.remaining === 0 ? 'Paid' : 'Partially Paid'}</td>
                            <td className="px-3 py-3 font-mono">{references}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="grid gap-3 border-t border-[#dcd8ce] bg-[#fbfaf7] p-5 sm:grid-cols-3">
                      <div><div className="text-[10px] uppercase text-[#8e959b]">Total invoiced</div><div className="mt-1 font-mono font-semibold">{formatCurrency(summary.totalInvoicedAmount, currency)}</div></div>
                      <div><div className="text-[10px] uppercase text-[#8e959b]">Total received</div><div className="mt-1 font-mono font-semibold">{formatCurrency(summary.totalReceivedAmount, currency)}</div></div>
                      <div><div className="text-[10px] uppercase text-[#8e959b]">Outstanding</div><div className="mt-1 font-mono font-semibold text-[#dc2626]">{formatCurrency(summary.outstandingAmount, currency)}</div></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 md:p-10">
                  <div className="mx-auto max-w-[720px] rounded-xl border border-[#e4e0d7] bg-white p-8 shadow-sm">
                    <div className="flex items-start justify-between border-b border-[#e4e0d7] pb-6">
                      <div><div className="text-[24px] font-semibold text-[#273341]">{client.name}</div><div className="mt-1 text-[12px] uppercase tracking-[.15em] text-[#8e959b]">Invoice</div></div>
                      <div className="text-right"><div className="font-mono text-[15px] font-semibold">INV-2058</div><div className="mt-1 text-[11px] text-[#8e959b]">August 2026 Retainer</div></div>
                    </div>
                    <div className="mt-6 grid gap-4 text-[12px] sm:grid-cols-2"><div><span className="text-[#8e959b]">Invoice date</span><div className="mt-1 font-medium">August 1, 2026</div></div><div><span className="text-[#8e959b]">Due date</span><div className="mt-1 font-medium">August 30, 2026</div></div></div>
                    <div className="mt-8 space-y-4 rounded-xl bg-[#f7f5ef] p-5 font-mono text-[14px]">
                      <div className="flex justify-between"><span className="text-[#65707b]">Invoice amount</span><span>{formatCurrency(outstandingInvoice?.amount || 0, currency)}</span></div>
                      <div className="flex justify-between"><span className="text-[#65707b]">Payment received</span><span>− {formatCurrency(outstandingInvoice?.amountPaid || 0, currency)}</span></div>
                      <div className="flex justify-between border-t border-[#d6d1c6] pt-4 font-semibold"><span>Balance due</span><span className="text-[#dc2626]">{formatCurrency(outstandingInvoice?.remaining || 0, currency)}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {emailOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17202a]/55 p-4" role="dialog" aria-modal="true">
            <div className="max-h-[92dvh] w-full max-w-[680px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e4e0d7] px-6 py-4">
                <div><div className="text-[15px] font-semibold text-[#273341]">Share with client</div><div className="mt-1 text-[11px] text-[#8e959b]">Prototype email composition</div></div>
                <button onClick={() => setEmailOpen(false)} className="rounded-lg p-2 text-[#65707b] hover:bg-[#f0eee7]" aria-label="Close email"><X size={18} /></button>
              </div>
              <div className="space-y-4 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold text-[#65707b]">From<input readOnly value="riteshux@gmail.com" className="mt-1.5 w-full rounded-lg border border-[#e4e0d7] bg-[#fbfaf7] px-3 py-2.5 text-[12px] font-normal text-[#273341]" /></label>
                  <label className="text-[11px] font-semibold text-[#65707b]">To<input readOnly value="accounts@bharatforge.com" className="mt-1.5 w-full rounded-lg border border-[#e4e0d7] bg-[#fbfaf7] px-3 py-2.5 text-[12px] font-normal text-[#273341]" /></label>
                </div>
                <label className="block text-[11px] font-semibold text-[#65707b]">Subject<input readOnly value={emailSubject} className="mt-1.5 w-full rounded-lg border border-[#e4e0d7] px-3 py-2.5 text-[12px] font-normal text-[#273341]" /></label>
                <label className="block text-[11px] font-semibold text-[#65707b]">Message<textarea readOnly value={emailBody} rows={12} className="mt-1.5 w-full resize-none rounded-lg border border-[#e4e0d7] px-3 py-3 text-[12px] font-normal leading-5 text-[#273341]" /></label>
                <div className="rounded-xl border border-[#e4e0d7] bg-[#fbfaf7] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#65707b]">Attachments</div>
                  <div className="mt-2 space-y-2 font-mono text-[10px] text-[#273341]">
                    {generatedDocuments.sheet && <div className="flex items-center gap-2"><CheckCircle2 size={13} className="text-[#19805a]" /> {RECONCILIATION_FILE}</div>}
                    {generatedDocuments.invoice && <div className="flex items-center gap-2"><CheckCircle2 size={13} className="text-[#19805a]" /> {INVOICE_FILE}</div>}
                  </div>
                </div>
                {emailSent && <div className="rounded-lg bg-[#edf9f3] px-4 py-3 text-[12px] font-semibold text-[#18784e]"><CheckCircle2 size={15} className="mr-2 inline" /> Demo email sent. No real email was transmitted.</div>}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e4e0d7] px-6 py-4">
                <button onClick={() => setEmailOpen(false)} className="rounded-lg px-4 py-2.5 text-[12px] font-semibold text-[#65707b] hover:bg-[#f0eee7]">Cancel</button>
                <a href={`mailto:accounts@bharatforge.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`} className="inline-flex items-center gap-2 rounded-lg border border-[#dcd8ce] px-4 py-2.5 text-[12px] font-semibold text-[#52606c] hover:border-[#2d8cff]"><ExternalLink size={14} /> Open in email client</a>
                <button onClick={() => setEmailSent(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#2d8cff] px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-[#1877e4]"><Mail size={14} /> Send email</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
