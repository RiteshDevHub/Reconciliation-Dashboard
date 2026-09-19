import { type ReactNode, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  ClipboardCheck,
  FileDown,
  FileSpreadsheet,
  Landmark,
  LayoutDashboard,
  Link2,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Modal = 'zoho' | 'statement' | 'review' | null;
type MatchStatus = 'Matched' | 'Needs review' | 'Partial';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/reconciliation', label: 'Reconciliation', icon: ClipboardCheck, count: '12' },
  { href: '/invoices', label: 'Invoices', icon: FileSpreadsheet },
  { href: '/bank-statements', label: 'Bank statements', icon: Landmark },
];

const receiptRows: { id: string; name: string; reference: string; date: string; amount: string; status: MatchStatus; confidence: string }[] = [
  { id: 'rcpt-01', name: 'Bharat Forge Systems', reference: 'HDFC •••• 7814', date: '18 Jun 2024', amount: '₹2,84,500', status: 'Matched', confidence: '100%' },
  { id: 'rcpt-02', name: 'Narayana Health Labs', reference: 'ICICI •••• 2309', date: '18 Jun 2024', amount: '₹1,26,780', status: 'Needs review', confidence: '—' },
  { id: 'rcpt-03', name: 'Indus Retail Group', reference: 'Axis •••• 4418', date: '17 Jun 2024', amount: '₹98,200', status: 'Partial', confidence: '82%' },
  { id: 'rcpt-04', name: 'Kaveri Foods Pvt. Ltd.', reference: 'HDFC •••• 7814', date: '17 Jun 2024', amount: '₹73,600', status: 'Matched', confidence: '100%' },
  { id: 'rcpt-05', name: 'Asteria Cloud Services', reference: 'Kotak •••• 0911', date: '16 Jun 2024', amount: '₹48,950', status: 'Matched', confidence: '100%' },
];

const invoices = [
  { id: 'INV-2406-118', customer: 'Narayana Health Labs', due: '18 Jun 2024', amount: '₹1,26,780', status: 'Open' },
  { id: 'INV-2406-109', customer: 'Indus Retail Group', due: '15 Jun 2024', amount: '₹2,14,200', status: 'Part paid' },
  { id: 'INV-2406-087', customer: 'Bharat Forge Systems', due: '12 Jun 2024', amount: '₹2,84,500', status: 'Paid' },
];

function AppShell({ children, onImport }: { children: ReactNode; onImport?: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-[#f7f5ef] text-[#1c2430]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col bg-[#202831] px-5 py-6 text-[#e8e8e1] transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#2d8cff] text-white shadow-[0_5px_18px_rgba(45,140,255,.25)]"><Link2 size={17} strokeWidth={2.5} /></span>
            <span className="text-[17px] font-semibold tracking-[-.03em]">Clear<span className="text-[#7eb8ff]">Match</span></span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-[#89939e] hover:bg-white/5 md:hidden" data-testid="button-close-mobile-nav"><X size={18} /></button>
        </div>

        <div className="mt-10 px-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#73808d]">Workspace</div>
        <nav className="mt-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon, count }) => {
            const active = location === href;
            return <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] transition-colors ${active ? 'bg-[#303b48] text-white' : 'text-[#a7b0b8] hover:bg-white/5 hover:text-white'}`}>
              <span className="flex items-center gap-3"><Icon size={16} strokeWidth={active ? 2.2 : 1.7} /><span>{label}</span></span>
              {count && <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${active ? 'bg-[#2d8cff] text-white' : 'bg-[#303a44] text-[#9da7b0]'}`}>{count}</span>}
            </Link>;
          })}
        </nav>

        <div className="mt-8 px-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#73808d]">Connections</div>
        <div className="mt-3 rounded-xl border border-white/8 bg-white/[.035] p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-[#d8f1e7] text-[#19774e]"><Building2 size={14} /></span>
            <div className="min-w-0"><div className="truncate text-[12px] font-medium text-[#eff3f1]">Zoho Books</div><div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#7dcaab]"><span className="size-1.5 rounded-full bg-[#4fca91]" /> Connected</div></div>
            <button className="ml-auto rounded-md p-1 text-[#77848e] hover:bg-white/10 hover:text-white" data-testid="button-connection-settings"><Settings2 size={14} /></button>
          </div>
        </div>

        <div className="mt-auto space-y-1 border-t border-white/8 pt-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-[#a7b0b8] hover:bg-white/5 hover:text-white" data-testid="button-help"><CircleHelp size={16} /> Help centre</button>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-[#a7b0b8] hover:bg-white/5 hover:text-white" data-testid="button-settings"><Settings2 size={16} /> Settings</button>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/[.035] px-3 py-3">
            <span className="grid size-8 place-items-center rounded-full bg-[#c9d9e8] text-[11px] font-bold text-[#26394a]">AM</span>
            <div><div className="text-[12px] font-medium text-white">Aarav Mehta</div><div className="text-[10px] text-[#7d8993]">Finance lead</div></div>
            <button className="ml-auto text-[#7d8993] hover:text-white" data-testid="button-account-menu"><MoreHorizontal size={16} /></button>
          </div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-[#17202a]/45 md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-mobile-overlay" />}
      <main className="min-h-[100dvh] md:pl-[256px]">
        <header className="flex h-[72px] items-center justify-between border-b border-[#e6e2d8] bg-[#f7f5ef]/95 px-5 backdrop-blur-md md:px-10">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-[#5d6875] hover:bg-[#ebe8df] md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-mobile-nav"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 text-[12px] text-[#7b8490] sm:flex"><span>ClearMatch</span><ChevronRight size={13} /><span className="text-[#26313e]">{location === '/' ? 'Overview' : location.slice(1).replaceAll('-', ' ')}</span></div>
            <div className="text-[14px] font-semibold tracking-[-.02em] text-[#26313e] sm:hidden">ClearMatch</div>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="hidden items-center gap-2 rounded-full border border-[#ddd9cf] bg-white/60 px-3 py-2 text-[12px] text-[#626d79] transition hover:border-[#bcb8ad] hover:bg-white sm:flex" data-testid="button-search"><Search size={14} /> Search <span className="ml-3 font-mono text-[10px] text-[#a2a6aa]">⌘ K</span></button>
            <button className="relative rounded-full p-2.5 text-[#65707b] hover:bg-[#ebe8df]" data-testid="button-notifications"><Bell size={17} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#2d8cff]" /></button>
            {onImport && <button onClick={onImport} className="hidden items-center gap-2 rounded-full bg-[#2d8cff] px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_5px_15px_rgba(45,140,255,.18)] transition hover:bg-[#1877e4] sm:flex" data-testid="button-header-import"><Upload size={14} /> Import statement</button>}
          </div>
        </header>
        <div>{children}</div>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: MatchStatus | string }) {
  const styles = status === 'Matched' || status === 'Paid' ? 'border-[#c4e9d7] bg-[#effaf4] text-[#18784e]' : status === 'Needs review' || status === 'Open' ? 'border-[#f0d0ad] bg-[#fff7ed] text-[#aa681e]' : 'border-[#cfdcf2] bg-[#f1f6ff] text-[#386da9]';
  return <span data-testid={`status-${status.toLowerCase().replaceAll(' ', '-')}`} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${styles}`}>{status === 'Matched' || status === 'Paid' ? <Check size={11} /> : <span className="size-1.5 rounded-full bg-current" />}{status}</span>;
}

function DashboardPage() {
  const [modal, setModal] = useState<Modal>(null);
  const [month, setMonth] = useState('June 2024');
  const [connected, setConnected] = useState(true);
  const [imported, setImported] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [toast, setToast] = useState('');

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const openImport = () => setModal('statement');
  const currentRows = reviewed ? receiptRows.filter((row) => row.id !== 'rcpt-02') : receiptRows;

  return <AppShell onImport={openImport}>
    <div className="quiet-grid relative overflow-hidden border-b border-[#e6e2d8] bg-[#242b35] px-5 pb-12 pt-10 text-[#f6f4ee] md:px-10 md:pb-14 md:pt-12">
      <div className="absolute -right-24 -top-44 size-[500px] rounded-full border border-[#5c7188]/20" /><div className="absolute -right-4 -top-24 size-[340px] rounded-full border border-[#5c7188]/15" />
      <div className="relative mx-auto max-w-[1380px] animate-rise">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#86baff]"><span className="size-1.5 rounded-full bg-[#63aaff]" /> Tuesday, 18 June 2024</div><h1 className="display text-[38px] leading-[.98] tracking-[-.025em] sm:text-[52px]">Good morning, Aarav.</h1><p className="mt-3 max-w-[430px] text-[13px] leading-6 text-[#abb7c2]">Your books are in shape. A few receipts need a closer look before the day gets moving.</p></div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="relative"><select value={month} onChange={(event) => { setMonth(event.target.value); notify(`Showing ${event.target.value}`); }} className="appearance-none rounded-full border border-[#51606f] bg-[#303a47] py-2.5 pl-4 pr-9 text-[12px] font-medium text-[#edf3f7] outline-none hover:border-[#8292a2]" data-testid="select-month-filter"><option>June 2024</option><option>May 2024</option><option>April 2024</option></select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-[#a5b0b9]" /></div>
            <button className="rounded-full border border-[#51606f] p-2.5 text-[#abb7c2] hover:border-[#8292a2] hover:text-white" onClick={() => notify('Workspace refreshed')} data-testid="button-refresh-dashboard"><RefreshCw size={15} /></button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Receipts this month', value: '₹18,42,650', sub: '84 payments recorded', icon: Banknote, tone: 'blue' },
            { label: 'Matched automatically', value: '91.8%', sub: '↑ 4.2% from May', icon: CheckCircle2, tone: 'green' },
            { label: 'Needs your attention', value: reviewed ? '11' : '12', sub: '₹3,64,980 to resolve', icon: CircleAlert, tone: 'amber' },
            { label: 'Open invoices', value: '₹8,26,400', sub: '27 invoices outstanding', icon: FileSpreadsheet, tone: 'cream' },
          ].map(({ label, value, sub, icon: Icon, tone }, index) => <div key={label} className={`animate-rise delay-${index + 1} rounded-2xl border p-4 ${tone === 'blue' ? 'border-[#397dbb]/60 bg-[#2c5e88]/35' : 'border-white/10 bg-white/[.045]'}`}>
            <div className="flex items-start justify-between"><span className="text-[11px] text-[#adb8c2]">{label}</span><Icon size={16} className={tone === 'green' ? 'text-[#72d0a6]' : tone === 'amber' ? 'text-[#efb46c]' : tone === 'blue' ? 'text-[#8fc5ff]' : 'text-[#d5c1a0]'} /></div><div className="mono mt-5 text-[24px] tracking-[-.07em] text-[#fbfaf6]">{value}</div><div className="mt-1 text-[10px] text-[#8f9ca8]">{sub}</div>
          </div>)}
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-10 md:py-10">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.8fr)]">
        <section className="animate-rise delay-2 overflow-hidden rounded-2xl border border-[#e4e0d7] bg-white shadow-[0_10px_35px_rgba(35,43,54,.035)]">
          <div className="flex flex-col justify-between gap-3 border-b border-[#ece9e2] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div><div className="flex items-center gap-2"><h2 className="text-[15px] font-semibold tracking-[-.025em] text-[#273341]">Recent receipts</h2><span className="rounded-full bg-[#f0f2f3] px-2 py-0.5 font-mono text-[10px] text-[#73808a]">{currentRows.length} of 84</span></div><p className="mt-1 text-[11px] text-[#8b9299]">Latest activity from your connected accounts</p></div>
            <Link href="/reconciliation" className="flex items-center gap-1 text-[11px] font-semibold text-[#247ce0] hover:text-[#155bb0]" data-testid="link-view-all-receipts">View all receipts <ArrowUpRight size={13} /></Link>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-[#efede8] text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ba0a4]"><th className="px-6 py-3 font-medium">Customer / reference</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 text-right font-medium">Amount</th><th className="px-4 py-3 font-medium">Status</th><th className="w-10 px-4 py-3" /></tr></thead><tbody>{currentRows.map((row) => <tr key={row.id} className="group border-b border-[#f0eee9] last:border-0 hover:bg-[#fcfbf8]" data-testid={`row-receipt-${row.id}`}><td className="px-6 py-4"><div className="text-[12px] font-semibold text-[#303a46]">{row.name}</div><div className="mono mt-1 text-[10px] text-[#9a9fa4]">{row.reference}</div></td><td className="px-4 py-4 text-[11px] text-[#6d7680]">{row.date}</td><td className="mono px-4 py-4 text-right text-[12px] font-medium text-[#303a46]">{row.amount}</td><td className="px-4 py-4"><StatusPill status={row.status} /></td><td className="px-4 py-4"><button onClick={() => row.status === 'Needs review' ? setModal('review') : notify(`${row.name} is already reconciled`)} className="rounded-lg p-1.5 text-[#98a0a7] opacity-60 transition hover:bg-[#eef4fb] hover:text-[#287fdc] group-hover:opacity-100" data-testid={`button-review-${row.id}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-[#efede8] bg-[#fcfbf8] px-6 py-3.5"><span className="text-[10px] text-[#9b9e9e]">Last synced 8 minutes ago</span><button onClick={() => notify('Zoho Books sync queued')} className="flex items-center gap-1.5 text-[10px] font-semibold text-[#697580] hover:text-[#247ce0]" data-testid="button-sync-zoho"><RefreshCw size={12} /> Sync Zoho Books</button></div>
        </section>

        <div className="space-y-5">
          <section className="animate-rise delay-3 rounded-2xl border border-[#e4e0d7] bg-[#f0eee7] p-5 sm:p-6">
            <div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.17em] text-[#8a8b87]"><Zap size={12} className="text-[#2d8cff]" /> Focus for today</div><h2 className="mt-3 text-[20px] font-semibold leading-tight tracking-[-.04em] text-[#2a3541]">Clear the last<br /><span className="display text-[28px] font-normal italic">loose ends.</span></h2></div><span className="grid size-9 place-items-center rounded-full bg-[#fbfaf7] text-[#e39b4f]"><CircleAlert size={17} /></span></div>
            <div className="mt-6 flex items-end justify-between"><div><div className="mono text-[28px] tracking-[-.07em] text-[#263441]">{reviewed ? '11' : '12'}</div><div className="mt-1 text-[11px] text-[#7f8587]">payments need review</div></div><div className="text-right"><div className="mono text-[13px] text-[#606b72]">₹3,64,980</div><div className="mt-1 text-[10px] text-[#969995]">unmatched value</div></div></div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#dadbd5]"><div className="h-full w-[78%] rounded-full bg-[#e5a155]" /></div>
            <button onClick={() => setModal('review')} className="mt-5 flex w-full items-center justify-between rounded-xl bg-[#27333e] px-4 py-3 text-[11px] font-semibold text-white transition hover:bg-[#334350]" data-testid="button-review-unmatched"><span>Review unmatched payments</span><ArrowUpRight size={14} /></button>
          </section>
          <section className="animate-rise delay-3 rounded-2xl border border-[#e4e0d7] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-[14px] font-semibold tracking-[-.02em] text-[#303b47]">Data connections</h2><p className="mt-1 text-[11px] text-[#8e959b]">Your sources are up to date</p></div><button className="rounded-lg p-1.5 text-[#929ba2] hover:bg-[#f1f3f3] hover:text-[#277edc]" onClick={() => setModal('zoho')} data-testid="button-manage-connections"><Settings2 size={15} /></button></div>
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#ecebe5] p-3"><span className="grid size-8 place-items-center rounded-lg bg-[#dff3e9] text-[#21815a]"><Building2 size={15} /></span><div className="flex-1"><div className="text-[11px] font-semibold text-[#3a4650]">Zoho Books</div><div className="mt-0.5 text-[10px] text-[#93999b]">ClearMatch Finance · 2 min ago</div></div><span className="flex items-center gap-1 text-[10px] font-semibold text-[#23815a]"><CheckCircle2 size={13} /> Live</span></div>
            <button onClick={openImport} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#d6d6cf] py-3 text-[11px] font-semibold text-[#697681] transition hover:border-[#88b6e8] hover:bg-[#f5f9fe] hover:text-[#277edc]" data-testid="button-import-another"><Upload size={14} /> Import a bank statement</button>
          </section>
        </div>
      </div>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[#e4e0d7] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#929797]">Reconciliation health</div><h2 className="mt-2 text-[16px] font-semibold tracking-[-.03em] text-[#303b47]">A calmer close is in sight.</h2></div><span className="mono text-[11px] text-[#19805a]">+8.6%</span></div>
          <div className="mt-7 flex items-end gap-2"><span className="mono text-[40px] tracking-[-.1em] text-[#273442]">91.8</span><span className="mb-2 text-[13px] text-[#7d878e]">%</span><span className="mb-2 ml-2 flex items-center gap-1 text-[10px] font-semibold text-[#20815a]"><ArrowUpRight size={12} /> vs last month</span></div>
          <div className="mt-4 flex h-16 items-end gap-1.5">{[30,38,34,44,42,57,51,61,58,72,76,84,91,82,95,91,96,91].map((height, index) => <div key={index} className={`flex-1 rounded-t-sm ${index === 17 ? 'bg-[#2d8cff]' : 'bg-[#dce9f6]'}`} style={{ height: `${height}%` }} />)}</div>
          <div className="mt-3 flex justify-between text-[10px] text-[#9a9e9f]"><span>01 Jun</span><span>Today</span></div>
        </div>
        <div className="rounded-2xl border border-[#e4e0d7] bg-[#252d36] p-5 text-[#edf1f2] sm:p-6">
          <div className="flex items-start justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#82909c]">Workflow note</div><h2 className="mt-2 display text-[28px] leading-none">Nothing slips<br /><em>through the cracks.</em></h2></div><FileDown size={18} className="text-[#71aeef]" /></div>
          <p className="mt-5 max-w-[420px] text-[12px] leading-5 text-[#aeb9c1]">ClearMatch pairs your bank movement with the right Zoho Books invoice, so your team can spend its time on decisions — not detective work.</p>
          <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-4"><span className="mono text-[11px] text-[#7eaccf]">01</span><span className="text-[11px] text-[#bac3c9]">Import statement</span><ChevronRight size={13} className="text-[#5f6c77]" /><span className="mono text-[11px] text-[#7eaccf]">02</span><span className="text-[11px] text-[#bac3c9]">Match &amp; close</span></div>
        </div>
      </section>
      <p className="mt-10 text-center text-[10px] text-[#a0a19d]">ClearMatch keeps a full audit trail for every decision · Last account check today at 09:42 IST</p>
    </div>

    {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#27333e] px-5 py-3 text-[12px] font-medium text-white shadow-xl" data-testid="status-toast">{toast}</div>}
    {modal === 'zoho' && <ModalShell title="Connect Zoho Books" subtitle="Keep invoices and payments in step with your books." onClose={() => setModal(null)}><div className="rounded-xl border border-[#e6e4dc] bg-[#faf9f5] p-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#dff3e9] text-[#21815a]"><Building2 size={19} /></span><div><div className="text-[13px] font-semibold">Zoho Books</div><div className="text-[11px] text-[#8c949a]">Sync invoices, contacts and payments</div></div></div></div><button onClick={() => { setConnected(true); setModal(null); notify('Zoho Books is connected'); }} className="mt-4 w-full rounded-xl bg-[#2d8cff] py-3 text-[12px] font-semibold text-white hover:bg-[#1877e4]" data-testid="button-connect-zoho">{connected ? 'Reconnect Zoho Books' : 'Connect Zoho Books'}</button></ModalShell>}
    {modal === 'statement' && <ModalShell title="Import a bank statement" subtitle="Bring in a CSV or Excel export from your bank." onClose={() => setModal(null)}><label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-[#cdd5de] bg-[#f8fbfe] px-5 py-8 text-center hover:border-[#6ea9e8]" data-testid="label-statement-upload"><span className="grid size-11 place-items-center rounded-full bg-[#e5f1ff] text-[#2d8cff]"><Upload size={19} /></span><span className="mt-3 text-[12px] font-semibold text-[#344251]">Drop statement here</span><span className="mt-1 text-[10px] text-[#99a1a8]">CSV, XLSX or PDF · up to 10 MB</span><input type="file" accept=".csv,.xlsx,.pdf" className="hidden" onChange={() => setImported(true)} data-testid="input-statement-file" /></label>{imported && <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#edf9f3] px-3 py-2 text-[11px] text-[#18784e]"><CheckCircle2 size={14} /> june-hdfc-statement.csv ready to import</div>}<button disabled={!imported} onClick={() => { setModal(null); setImported(false); notify('Statement imported — 7 new receipts found'); }} className="mt-4 w-full rounded-xl bg-[#2d8cff] py-3 text-[12px] font-semibold text-white transition hover:bg-[#1877e4] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-confirm-import">Import statement</button></ModalShell>}
    {modal === 'review' && <ModalShell title="Review unmatched payment" subtitle="One payment is waiting for your decision." onClose={() => setModal(null)}><div className="rounded-xl border border-[#ece8df] bg-[#faf9f5] p-4"><div className="flex items-start justify-between"><div><div className="text-[13px] font-semibold text-[#303b47]">Narayana Health Labs</div><div className="mono mt-1 text-[10px] text-[#92999f]">ICICI •••• 2309 · NEFT 184009</div></div><div className="mono text-[15px] font-semibold text-[#283541]">₹1,26,780</div></div><div className="mt-4 border-t border-[#ebe6db] pt-3 text-[11px] text-[#69747d]">No exact invoice match found in Zoho Books.</div></div><div className="mt-4 grid gap-2"><button onClick={() => { setReviewed(true); setModal(null); notify('Payment marked as matched'); }} className="flex items-center justify-between rounded-xl border border-[#c8e6d7] bg-[#f0fbf5] px-4 py-3 text-[11px] font-semibold text-[#197c51] hover:bg-[#e4f7ed]" data-testid="button-mark-matched">Match to INV-2406-118 <Check size={15} /></button><button onClick={() => { setModal(null); notify('Payment left for later'); }} className="flex items-center justify-between rounded-xl border border-[#e5e1d8] px-4 py-3 text-[11px] font-semibold text-[#596672] hover:bg-[#f7f5ef]" data-testid="button-snooze-review">Keep for later <ChevronRight size={15} /></button></div></ModalShell>}
  </AppShell>;
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#18232e]/45 p-4 backdrop-blur-[2px]" onMouseDown={onClose} data-testid="modal-overlay"><div className="w-full max-w-[420px] rounded-2xl border border-[#e5e1d8] bg-white p-5 shadow-[0_25px_90px_rgba(22,32,44,.2)] sm:p-6" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h2 className="text-[19px] font-semibold tracking-[-.04em] text-[#263441]">{title}</h2><p className="mt-1 text-[11px] text-[#8b9399]">{subtitle}</p></div><button onClick={onClose} className="rounded-lg p-1.5 text-[#9ca2a5] hover:bg-[#f2f1ec] hover:text-[#45515a]" data-testid="button-close-modal"><X size={16} /></button></div><div className="mt-6">{children}</div></div></div>;
}

function SectionPage({ title, kicker, description, icon: Icon }: { title: string; kicker: string; description: string; icon: typeof LayoutDashboard }) {
  const [location] = useLocation();
  const [toast, setToast] = useState('');
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400); };
  return <AppShell onImport={() => notify('Open Overview to import a statement')}><div className="mx-auto max-w-[1380px] px-5 py-10 md:px-10 md:py-14"><div className="animate-rise rounded-2xl bg-[#242b35] px-6 py-8 text-white sm:px-10 sm:py-10"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#86baff]"><Icon size={13} /> {kicker}</div><h1 className="display mt-4 text-[46px] leading-none sm:text-[58px]">{title}</h1><p className="mt-4 max-w-[530px] text-[13px] leading-6 text-[#b4bec8]">{description}</p></div><button onClick={() => notify('View refreshed')} className="rounded-full border border-[#51606f] p-2.5 text-[#abb7c2] hover:border-[#8292a2] hover:text-white" data-testid="button-refresh-section"><RefreshCw size={15} /></button></div></div><div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-[#e4e0d7] bg-white p-5 sm:p-6"><div className="flex items-center justify-between border-b border-[#efede8] pb-4"><div><h2 className="text-[15px] font-semibold text-[#303b47]">Work queue</h2><p className="mt-1 text-[11px] text-[#8b9299]">Your most recent finance activity</p></div><button onClick={() => notify('Export prepared')} className="flex items-center gap-2 rounded-full border border-[#ddd9cf] px-3 py-2 text-[11px] font-semibold text-[#5e6c77] hover:bg-[#faf9f5]" data-testid="button-export-section"><ArrowDownToLine size={13} /> Export</button></div><div className="divide-y divide-[#efede8]">{(location === '/invoices' ? invoices : receiptRows).map((item, index) => { const name = 'customer' in item ? item.customer : item.name; const amount = item.amount; const status = 'status' in item ? item.status : 'Matched'; return <div key={index} className="flex items-center justify-between gap-3 py-4"><div><div className="text-[12px] font-semibold text-[#35414d]">{name}</div><div className="mono mt-1 text-[10px] text-[#99a0a5]">{'reference' in item ? item.reference : item.id}</div></div><div className="flex items-center gap-4"><span className="mono text-[12px] text-[#35414d]">{amount}</span><StatusPill status={status} /></div></div>; })}</div></section><section className="rounded-2xl border border-[#e4e0d7] bg-[#f0eee7] p-6"><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#929797]">Workspace signal</div><div className="mt-5 display text-[32px] leading-[.98] text-[#2a3541]">Everything you need,<br /><em>in one clear view.</em></div><p className="mt-5 text-[12px] leading-5 text-[#737b7e]">Keep your books, bank movement and decisions connected. This workspace updates as your team closes the queue.</p><div className="mt-6 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-3 text-[11px] font-semibold text-[#247c57]"><CheckCircle2 size={15} /> All connected sources are healthy</div></section></div></div>{toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#27333e] px-5 py-3 text-[12px] text-white shadow-xl" data-testid="status-section-toast">{toast}</div>}</AppShell>;
}

function Router() {
  return <Switch><Route path="/" component={DashboardPage} /><Route path="/reconciliation" component={() => <SectionPage title="Reconciliation" kicker="Payment control" description="A focused queue for every receipt that needs a confident match, from bank movement to the right invoice." icon={ClipboardCheck} />} /><Route path="/invoices" component={() => <SectionPage title="Invoices" kicker="Zoho Books" description="Know what is paid, what is open, and which customer conversations deserve your attention next." icon={FileSpreadsheet} />} /><Route path="/bank-statements" component={() => <SectionPage title="Bank statements" kicker="Source records" description="Bring statements into one dependable place and keep a clean line from imported movement to final decision." icon={Landmark} />} /><Route component={NotFound} /></Switch>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;