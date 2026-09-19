import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2,
  CircleAlert,
  Clock,
  HelpCircle,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { useReconciliation } from '../data/ReconciliationContext';
import { ClientSummary, ClientStatus } from '../data/reconciliation';
import { AppShell } from '../App';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator } from '../components/ui/dropdown-menu';

const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

function StatusIcon({ status, className, size = 16 }: { status: ClientStatus; className?: string; size?: number }) {
  switch (status) {
    case 'Fully reconciled': return <CheckCircle2 className={className || "text-[#19805a]"} size={size} />;
    case 'Partially paid': return <Clock className={className || "text-[#e39b4f]"} size={size} />;
    case 'Payment overdue': return <AlertTriangle className={className || "text-[#dc2626]"} size={size} />;
    case 'Needs matching': return <HelpCircle className={className || "text-[#2d8cff]"} size={size} />;
    case 'Invoice not raised': return <FileSpreadsheet className={className || "text-[#65707b]"} size={size} />;
    case 'Upcoming': return <Clock className={className || "text-[#65707b]"} size={size} />;
    case 'Exception': return <CircleAlert className={className || "text-[#dc2626]"} size={size} />;
    default: return null;
  }
}

function KanbanCard({ summary }: { summary: ClientSummary }) {
  const [, setLocation] = useLocation();
  const c = summary.client;
  const nextOpenInvoice = summary.invoices.find(invoice => invoice.remaining > 0);
  const statusLabel =
    summary.status === 'Partially paid'
      ? `${formatCurrency(summary.outstandingAmount, summary.currency)} outstanding`
      : summary.status === 'Payment overdue'
        ? `${summary.daysOverdue ?? 0} days overdue`
        : summary.status === 'Upcoming' && nextOpenInvoice
          ? `Due ${format(parseISO(nextOpenInvoice.dueDate), 'MMM d, yyyy')}`
          : summary.statusMessage || summary.status;
  const warning =
    summary.status === 'Exception'
      ? summary.payments.find(payment => payment.exceptionReason)?.exceptionReason
      : summary.status === 'Needs matching'
        ? `${summary.unmatchedPayments[0]?.reference} · ${summary.invoices.filter(invoice => invoice.remaining > 0).length} potential invoices`
        : summary.status === 'Invoice not raised'
          ? `Expected ${c.expectedBillingPeriods.find(period => !summary.invoices.some(invoice => invoice.billingPeriod.includes(period))) ?? 'billing period'}`
          : undefined;
  
  return (
    <div 
      onClick={() => setLocation(`/reconciliation/${c.id}`)}
      className="group cursor-pointer rounded-xl border border-[#e4e0d7] bg-white p-4 shadow-[0_2px_8px_rgba(35,43,54,.02)] transition-all hover:border-[#2d8cff]/50 hover:shadow-[0_8px_24px_rgba(45,140,255,.08)]"
      data-testid={`card-client-${c.id}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[#273341]">{c.name}</h3>
          <p className="mt-0.5 text-[11px] text-[#8e959b]">{c.country} Client · {c.retainerFrequency}</p>
        </div>
      </div>
      
      <div className="mb-4 grid grid-cols-2 gap-y-2 text-[12px]">
        <div className="text-[#65707b]">Invoices</div>
         <div className="font-medium text-[#273341] text-right">{summary.activeInvoicesCount}</div>
        
        <div className="text-[#65707b]">Invoiced</div>
        <div className="font-medium text-[#273341] text-right">{formatCurrency(summary.totalInvoicedAmount, summary.currency)}</div>
        
        <div className="text-[#65707b]">Received</div>
        <div className="font-medium text-[#273341] text-right">{formatCurrency(summary.totalReceivedAmount, summary.currency)}</div>
        
        <div className="text-[#65707b]">Outstanding</div>
        <div className="font-semibold text-[#dc2626] text-right">{formatCurrency(summary.outstandingAmount, summary.currency)}</div>
      </div>
      
      <div className="mt-auto border-t border-[#efede8] pt-3">
        {warning && (
          <p className="mb-2 line-clamp-2 text-[10px] leading-4 text-[#8b5f35]">{warning}</p>
        )}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 font-medium text-[#273341]">
            <StatusIcon status={summary.status} size={14} />
            <span className="truncate max-w-[160px]">{statusLabel}</span>
          </div>
          {summary.lastPaymentDate && (
            <div className="text-[#8e959b]">
              Last pay: {format(parseISO(summary.lastPaymentDate), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReconciliationKanbanPage() {
  const { summaries } = useReconciliation();
  const [search, setSearch] = useState('');
  
  const [sortParam, setSortParam] = useState<'outstanding' | 'dueDate' | 'name' | 'lastPayment'>('outstanding');
  const [filterCountry, setFilterCountry] = useState<'All' | 'India' | 'US'>('All');
  const [filterRetainer, setFilterRetainer] = useState<'All' | 'Monthly' | 'Quarterly'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | ClientStatus | 'Partially paid / unmatched'>('All');

  // Filtering & Sorting logic
  const filteredSummaries = useMemo(() => {
    let result = summaries.filter(s => 
      s.client.name.toLowerCase().includes(search.toLowerCase())
    );
    
    if (filterCountry !== 'All') {
      result = result.filter(s => s.client.country === filterCountry);
    }
    
    if (filterRetainer !== 'All') {
      result = result.filter(s => s.client.retainerFrequency === filterRetainer);
    }

    if (filterStatus === 'Partially paid / unmatched') {
      result = result.filter(s => ['Partially paid', 'Needs matching', 'Exception'].includes(s.status));
    } else if (filterStatus !== 'All') {
      result = result.filter(s => s.status === filterStatus);
    }
    
    result.sort((a, b) => {
      if (sortParam === 'outstanding') return b.outstandingAmount - a.outstandingAmount;
      if (sortParam === 'name') return a.client.name.localeCompare(b.client.name);
      if (sortParam === 'dueDate') {
        const aDue = a.invoices.find(invoice => invoice.remaining > 0)?.dueDate;
        const bDue = b.invoices.find(invoice => invoice.remaining > 0)?.dueDate;
        if (!aDue) return 1;
        if (!bDue) return -1;
        return parseISO(aDue).getTime() - parseISO(bDue).getTime();
      }
      if (sortParam === 'lastPayment') {
        if (!a.lastPaymentDate) return 1;
        if (!b.lastPaymentDate) return -1;
        return parseISO(b.lastPaymentDate).getTime() - parseISO(a.lastPaymentDate).getTime();
      }
      return 0;
    });

    return result;
  }, [summaries, search, filterCountry, filterRetainer, filterStatus, sortParam]);

  const columns: { title: string; statuses: ClientStatus[] }[] = [
    { title: 'Invoice Pending', statuses: ['Invoice not raised'] },
    { title: 'Payment Overdue', statuses: ['Payment overdue'] },
    { title: 'Partially Paid', statuses: ['Partially paid', 'Needs matching', 'Exception'] },
    { title: 'Upcoming', statuses: ['Upcoming'] },
    { title: 'Fully Reconciled', statuses: ['Fully reconciled'] },
  ];

  // Calculations for summary header
  const totalClients = summaries.length;
  const fullyReconciledCount = summaries.filter(s => s.status === 'Fully reconciled').length;
  const needsAttentionCount = summaries.filter(s => !['Fully reconciled', 'Upcoming'].includes(s.status)).length;
  
  const usdOutstanding = summaries.filter(s => s.currency === 'USD').reduce((acc, s) => acc + s.outstandingAmount, 0);
  const inrOutstanding = summaries.filter(s => s.currency === 'INR').reduce((acc, s) => acc + s.outstandingAmount, 0);
  
  const usdUnmatched = summaries.filter(s => s.currency === 'USD').reduce((acc, s) => acc + s.totalUnallocatedAmount, 0);
  const inrUnmatched = summaries.filter(s => s.currency === 'INR').reduce((acc, s) => acc + s.totalUnallocatedAmount, 0);

  return (
    <AppShell>
      <div className="min-h-[calc(100dvh-72px)] bg-[#f7f5ef]">
        <div className="border-b border-[#e6e2d8] bg-white px-5 py-6 md:px-10">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="display text-[32px] leading-none tracking-tight text-[#26313e]">Client Reconciliation</h1>
              <p className="mt-2 text-[13px] text-[#7b8490]">Manage retainer reconciliations across all active clients.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-[12px]">
              <div className="flex flex-col gap-1">
                <span className="text-[#8e959b]">Total Clients</span>
                <span className="font-semibold text-[#273341]">{totalClients}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8e959b]">Fully Reconciled</span>
                <span className="font-semibold text-[#19805a]">{fullyReconciledCount}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8e959b]">Needs Attention</span>
                <span className="font-semibold text-[#dc2626]">{needsAttentionCount}</span>
              </div>
              <div className="flex flex-col gap-1 border-l border-[#e4e0d7] pl-6">
                <span className="text-[#8e959b]">Outstanding</span>
                <span className="font-semibold text-[#273341]">
                  {formatCurrency(usdOutstanding, 'USD')} <span className="text-[#aeb9c1]">/</span> {formatCurrency(inrOutstanding, 'INR')}
                </span>
              </div>
              <div className="flex flex-col gap-1 border-l border-[#e4e0d7] pl-6">
                <span className="text-[#8e959b]">Unmatched Payments</span>
                <span className="font-semibold text-[#2d8cff]">
                  {formatCurrency(usdUnmatched, 'USD')} <span className="text-[#aeb9c1]">/</span> {formatCurrency(inrUnmatched, 'INR')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative max-w-[320px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e959b]" size={16} />
              <input 
                type="text" 
                placeholder="Search clients..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[#e4e0d7] bg-[#fbfaf7] py-2 pl-10 pr-4 text-[13px] outline-none transition focus:border-[#2d8cff] focus:ring-1 focus:ring-[#2d8cff]"
                data-testid="input-search-clients"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg border border-[#e4e0d7] bg-white px-3 py-2 text-[12px] font-medium text-[#65707b] hover:bg-[#fbfaf7]">
                   <Filter size={14} /> Filter {filterCountry !== 'All' || filterRetainer !== 'All' || filterStatus !== 'All' ? '(Active)' : ''}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Region</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filterCountry} onValueChange={(val: any) => setFilterCountry(val)}>
                  <DropdownMenuRadioItem value="All">All Countries</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="India">India</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="US">US</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Retainer Frequency</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filterRetainer} onValueChange={(val: any) => setFilterRetainer(val)}>
                  <DropdownMenuRadioItem value="All">All</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Monthly">Monthly</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Quarterly">Quarterly</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                  <DropdownMenuRadioItem value="All">All statuses</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Fully reconciled">Fully reconciled</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Partially paid / unmatched">Partially paid / unmatched</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Payment overdue">Payment overdue</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Invoice not raised">Invoice pending</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Upcoming">Upcoming</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg border border-[#e4e0d7] bg-white px-3 py-2 text-[12px] font-medium text-[#65707b] hover:bg-[#fbfaf7]">
                  <ArrowUpDown size={14} /> Sort
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuRadioGroup value={sortParam} onValueChange={(val: any) => setSortParam(val)}>
                  <DropdownMenuRadioItem value="outstanding">Highest Outstanding</DropdownMenuRadioItem>
                   <DropdownMenuRadioItem value="dueDate">Due Date</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name">Client Name</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="lastPayment">Last Payment Date</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="overflow-x-auto p-5 md:p-10">
          <div className="flex min-w-max items-stretch gap-6">
            {columns.map(col => {
              const colSummaries = filteredSummaries.filter(s => col.statuses.includes(s.status));
              return (
                <div key={col.title} className="flex w-[340px] flex-col rounded-xl bg-[#f0eee7]/50 p-4">
                  <div className="sticky top-[72px] z-10 -mx-1 mb-4 flex items-center justify-between rounded-lg bg-[#eeece5] px-1 py-3">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#65707b]">{col.title}</h2>
                    <span className="rounded-full bg-[#e4e0d7] px-2 py-0.5 text-[11px] font-medium text-[#273341]">{colSummaries.length}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-4 pb-4">
                    {colSummaries.map(summary => (
                      <KanbanCard key={summary.client.id} summary={summary} />
                    ))}
                    {colSummaries.length === 0 && (
                      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-[#d6d6cf] text-[12px] text-[#8e959b]">
                        No clients here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
