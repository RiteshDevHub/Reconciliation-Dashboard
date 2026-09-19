import { type ReactNode, useState, useEffect, useRef } from 'react';
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
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { useGetZohoConnectionStatus, getGetZohoConnectionStatusQueryKey, useListZohoInvoices, useSyncZohoInvoices, getListZohoInvoicesQueryKey } from '@workspace/api-client-react';

const queryClient = new QueryClient();

// --- Clerk Auth Setup ---
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(215, 91%, 56%)",
    colorForeground: "hsl(220, 24%, 14%)",
    colorMutedForeground: "hsl(218, 10%, 44%)",
    colorDanger: "hsl(4, 72%, 52%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(0, 0%, 100%)",
    colorInputForeground: "hsl(220, 24%, 14%)",
    colorNeutral: "hsl(35, 19%, 87%)",
    fontFamily: "var(--app-font-sans)",
    borderRadius: "0.8rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-[#e4e0d7]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#263441] font-semibold text-[24px] tracking-[-.04em]",
    headerSubtitle: "text-[#8b9399] text-[13px] mt-1",
    socialButtonsBlockButtonText: "text-[#303b47] font-medium text-[13px]",
    formFieldLabel: "text-[#303b47] font-semibold text-[13px]",
    footerActionLink: "text-[#2d8cff] font-semibold hover:text-[#1877e4]",
    footerActionText: "text-[#8b9399] text-[13px]",
    dividerText: "text-[#8b9399] text-[12px]",
    identityPreviewEditButton: "text-[#2d8cff] hover:text-[#1877e4]",
    formFieldSuccessText: "text-[#18784e]",
    alertText: "text-[#aa681e]",
    logoBox: "mb-6 flex justify-center",
    logoImage: "h-10",
    socialButtonsBlockButton: "border-[#e6e4dc] bg-white hover:bg-[#faf9f5] rounded-xl transition",
    formButtonPrimary: "bg-[#2d8cff] hover:bg-[#1877e4] text-white font-semibold rounded-xl py-3 shadow-[0_5px_15px_rgba(45,140,255,.18)] transition",
    formFieldInput: "border-[#e6e4dc] bg-white rounded-xl focus:border-[#2d8cff] focus:ring focus:ring-[#2d8cff]/20 text-[13px]",
    footerAction: "mt-6 border-t border-[#e6e4dc] pt-6",
    dividerLine: "bg-[#e6e4dc]",
    alert: "bg-[#fff7ed] border-[#f0d0ad]",
    otpCodeFieldInput: "border-[#e6e4dc] focus:border-[#2d8cff]",
    formFieldRow: "mb-4",
    main: "mt-2",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener]);

  return null;
}

// --- Data Types & Mock Data ---
type Modal = 'zoho' | 'statement' | 'review' | null;
type MatchStatus = 'Matched' | 'Needs review' | 'Partial';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
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


// --- Pages & Components ---

function AppShell({ children, onImport }: { children: ReactNode; onImport?: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { data: status } = useGetZohoConnectionStatus();

  return (
    <div className="min-h-[100dvh] bg-[#f7f5ef] text-[#1c2430]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col bg-[#202831] px-5 py-6 text-[#e8e8e1] transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" className="flex items-center gap-3" data-testid="link-brand">
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
            <div className="min-w-0"><div className="truncate text-[12px] font-medium text-[#eff3f1]">{status?.organizationName || 'Zoho Books'}</div><div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#7dcaab]"><span className="size-1.5 rounded-full bg-[#4fca91]" /> Connected</div></div>
            <button className="ml-auto rounded-md p-1 text-[#77848e] hover:bg-white/10 hover:text-white" data-testid="button-connection-settings"><Settings2 size={14} /></button>
          </div>
        </div>

        <div className="mt-auto space-y-1 border-t border-white/8 pt-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-[#a7b0b8] hover:bg-white/5 hover:text-white" data-testid="button-help"><CircleHelp size={16} /> Help centre</button>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-[#a7b0b8] hover:bg-white/5 hover:text-white" data-testid="button-settings"><Settings2 size={16} /> Settings</button>
          
          <div className="mt-3 flex flex-col gap-1.5 rounded-xl bg-white/[.035] px-3 py-3">
            <div className="flex items-center gap-3">
              {isLoaded ? (
                <>
                  <span className="grid size-8 place-items-center rounded-full bg-[#c9d9e8] text-[11px] font-bold text-[#26394a] overflow-hidden">
                    {user?.imageUrl ? <img src={user.imageUrl} alt={user?.fullName || ''} className="size-full object-cover" /> : (user?.firstName?.[0] || 'U')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-white">{user?.fullName || 'Finance Lead'}</div>
                    <div className="truncate text-[10px] text-[#7d8993]">{user?.primaryEmailAddress?.emailAddress || 'User'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="size-8 rounded-full skeleton" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3 w-16 skeleton rounded" />
                    <div className="h-2 w-20 skeleton rounded" />
                  </div>
                </>
              )}
            </div>
            <button onClick={() => signOut({ redirectUrl: basePath || "/" })} className="mt-2 w-full rounded border border-white/10 bg-white/5 py-1.5 text-[11px] font-semibold text-[#a7b0b8] transition hover:bg-white/10 hover:text-white" data-testid="button-sign-out">Sign out</button>
          </div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-[#17202a]/45 md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-mobile-overlay" />}
      <main className="min-h-[100dvh] md:pl-[256px]">
        <header className="flex h-[72px] items-center justify-between border-b border-[#e6e2d8] bg-[#f7f5ef]/95 px-5 backdrop-blur-md md:px-10">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-[#5d6875] hover:bg-[#ebe8df] md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-mobile-nav"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 text-[12px] text-[#7b8490] sm:flex"><span>ClearMatch</span><ChevronRight size={13} /><span className="text-[#26313e]">{location === '/dashboard' ? 'Overview' : location.slice(1).replaceAll('-', ' ')}</span></div>
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
  const [imported, setImported] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [toast, setToast] = useState('');
  const { user } = useUser();
  const { data: status } = useGetZohoConnectionStatus();
  const connected = status?.connected ?? false;

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
          <div><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#86baff]"><span className="size-1.5 rounded-full bg-[#63aaff]" /> Tuesday, 18 June 2024</div><h1 className="display text-[38px] leading-[.98] tracking-[-.025em] sm:text-[52px]">Good morning, {user?.firstName || 'Aarav'}.</h1><p className="mt-3 max-w-[430px] text-[13px] leading-6 text-[#abb7c2]">Your books are in shape. A few receipts need a closer look before the day gets moving.</p></div>
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
    {modal === 'zoho' && <ModalShell title="Connect Zoho Books" subtitle="Keep invoices and payments in step with your books." onClose={() => setModal(null)}><div className="rounded-xl border border-[#e6e4dc] bg-[#faf9f5] p-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#dff3e9] text-[#21815a]"><Building2 size={19} /></span><div><div className="text-[13px] font-semibold">Zoho Books</div><div className="text-[11px] text-[#8c949a]">Sync invoices, contacts and payments</div></div></div></div><a href={`/api/integrations/zoho/authorize?returnTo=${encodeURIComponent(window.location.origin + basePath + '/dashboard')}`} className="mt-4 flex justify-center w-full rounded-xl bg-[#2d8cff] py-3 text-[12px] font-semibold text-white hover:bg-[#1877e4]" data-testid="button-connect-zoho">{connected ? 'Reconnect Zoho Books' : 'Connect Zoho Books'}</a></ModalShell>}
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
  return <AppShell onImport={() => notify('Open Overview to import a statement')}><div className="mx-auto max-w-[1380px] px-5 py-10 md:px-10 md:py-14"><div className="animate-rise rounded-2xl bg-[#242b35] px-6 py-8 text-white sm:px-10 sm:py-10"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#86baff]"><Icon size={13} /> {kicker}</div><h1 className="display mt-4 text-[46px] leading-none sm:text-[58px]">{title}</h1><p className="mt-4 max-w-[530px] text-[13px] leading-6 text-[#b4bec8]">{description}</p></div><button onClick={() => notify('View refreshed')} className="rounded-full border border-[#51606f] p-2.5 text-[#abb7c2] hover:border-[#8292a2] hover:text-white" data-testid="button-refresh-section"><RefreshCw size={15} /></button></div></div><div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-[#e4e0d7] bg-white p-5 sm:p-6"><div className="flex items-center justify-between border-b border-[#efede8] pb-4"><div><h2 className="text-[15px] font-semibold text-[#303b47]">Work queue</h2><p className="mt-1 text-[11px] text-[#8b9299]">Your most recent finance activity</p></div><button onClick={() => notify('Export prepared')} className="flex items-center gap-2 rounded-full border border-[#ddd9cf] px-3 py-2 text-[11px] font-semibold text-[#5e6c77] hover:bg-[#faf9f5]" data-testid="button-export-section"><ArrowDownToLine size={13} /> Export</button></div><div className="divide-y divide-[#efede8]">{receiptRows.map((item, index) => { const name = item.name; const amount = item.amount; const status = item.status; return <div key={index} className="flex items-center justify-between gap-3 py-4"><div><div className="text-[12px] font-semibold text-[#35414d]">{name}</div><div className="mono mt-1 text-[10px] text-[#99a0a5]">{item.reference}</div></div><div className="flex items-center gap-4"><span className="mono text-[12px] text-[#35414d]">{amount}</span><StatusPill status={status} /></div></div>; })}</div></section><section className="rounded-2xl border border-[#e4e0d7] bg-[#f0eee7] p-6"><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#929797]">Workspace signal</div><div className="mt-5 display text-[32px] leading-[.98] text-[#2a3541]">Everything you need,<br /><em>in one clear view.</em></div><p className="mt-5 text-[12px] leading-5 text-[#737b7e]">Keep your books, bank movement and decisions connected. This workspace updates as your team closes the queue.</p><div className="mt-6 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-3 text-[11px] font-semibold text-[#247c57]"><CheckCircle2 size={15} /> All connected sources are healthy</div></section></div></div>{toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#27333e] px-5 py-3 text-[12px] text-white shadow-xl" data-testid="status-section-toast">{toast}</div>}</AppShell>;
}

function ZohoInvoicesPage() {
  const [toast, setToast] = useState('');
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400); };
  
  const queryClient = useQueryClient();
  const { data: invoices, isLoading, isError } = useListZohoInvoices();
  const syncMutation = useSyncZohoInvoices({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListZohoInvoicesQueryKey() });
        notify(`Synced ${data.syncedCount} invoices successfully`);
      },
      onError: () => {
        notify('Failed to sync invoices. Please try again.');
      }
    }
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  const formatAmount = (amount: string, currencyCode: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currencyCode }).format(num);
  };

  return (
    <AppShell onImport={() => notify('Open Overview to import a statement')}>
      <div className="mx-auto max-w-[1380px] px-5 py-10 md:px-10 md:py-14">
        <div className="animate-rise rounded-2xl bg-[#242b35] px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#86baff]">
                <FileSpreadsheet size={13} /> Zoho Books
              </div>
              <h1 className="display mt-4 text-[46px] leading-none sm:text-[58px]">Invoices</h1>
              <p className="mt-4 max-w-[530px] text-[13px] leading-6 text-[#b4bec8]">Know what is paid, what is open, and which customer conversations deserve your attention next.</p>
            </div>
            <button 
              onClick={handleSync} 
              disabled={syncMutation.isPending}
              className="rounded-full border border-[#51606f] p-2.5 text-[#abb7c2] hover:border-[#8292a2] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" 
              data-testid="button-sync-invoices"
            >
              <RefreshCw size={15} className={syncMutation.isPending ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <section className="rounded-2xl border border-[#e4e0d7] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#efede8] pb-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#303b47]">Work queue</h2>
                <p className="mt-1 text-[11px] text-[#8b9299]">Your most recent finance activity</p>
              </div>
              <button onClick={() => notify('Export prepared')} className="flex items-center gap-2 rounded-full border border-[#ddd9cf] px-3 py-2 text-[11px] font-semibold text-[#5e6c77] hover:bg-[#faf9f5]" data-testid="button-export-section">
                <ArrowDownToLine size={13} /> Export
              </button>
            </div>
            <div className="divide-y divide-[#efede8]">
              {isLoading && (
                <div className="py-12 text-center text-[#73808d] flex flex-col items-center">
                   <div className="size-6 rounded-full border-2 border-[#2d8cff] border-t-transparent animate-spin mb-3"></div>
                   <div className="text-[12px] font-medium">Loading invoices...</div>
                </div>
              )}
              {isError && (
                <div className="py-12 text-center flex flex-col items-center">
                   <CircleAlert size={24} className="text-[#e39b4f] mb-3" />
                   <div className="text-[13px] font-medium text-[#1c2430]">Failed to load invoices</div>
                   <div className="text-[11px] text-[#636e7a] mt-1">Check your connection and try again.</div>
                   <button onClick={() => queryClient.invalidateQueries({ queryKey: getListZohoInvoicesQueryKey() })} className="mt-4 text-[11px] font-semibold text-[#2d8cff]">Try again</button>
                </div>
              )}
              {!isLoading && !isError && invoices?.length === 0 && (
                <div className="py-12 text-center text-[#73808d] flex flex-col items-center">
                   <FileSpreadsheet size={24} className="text-[#dcd6c8] mb-3" />
                   <div className="text-[13px] font-medium text-[#1c2430]">No invoices found</div>
                   <div className="text-[11px] text-[#636e7a] mt-1">Sync with Zoho Books to pull your latest data.</div>
                </div>
              )}
              {!isLoading && !isError && invoices && invoices.map((invoice) => (
                <div key={invoice.invoiceId} className="flex items-center justify-between gap-3 py-4">
                  <div>
                    <div className="text-[12px] font-semibold text-[#35414d]">{invoice.customerName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="mono text-[10px] text-[#99a0a5]">{invoice.invoiceNumber}</span>
                      <span className="text-[10px] text-[#b0b7bc]">·</span>
                      <span className="text-[10px] text-[#99a0a5]">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="mono text-[12px] text-[#35414d] block">{formatAmount(invoice.total, invoice.currencyCode)}</span>
                      {parseFloat(invoice.balance) > 0 && parseFloat(invoice.balance) !== parseFloat(invoice.total) && (
                        <span className="mono text-[9px] text-[#e39b4f] mt-0.5 block">Bal: {formatAmount(invoice.balance, invoice.currencyCode)}</span>
                      )}
                    </div>
                    <StatusPill status={invoice.status === 'paid' ? 'Paid' : invoice.status === 'sent' ? 'Open' : invoice.status === 'partially_paid' ? 'Part paid' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ')} />
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          <section className="rounded-2xl border border-[#e4e0d7] bg-[#f0eee7] p-6 self-start">
            <div className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#929797]">Workspace signal</div>
            <div className="mt-5 display text-[32px] leading-[.98] text-[#2a3541]">Everything you need,<br /><em>in one clear view.</em></div>
            <p className="mt-5 text-[12px] leading-5 text-[#737b7e]">Keep your books, bank movement and decisions connected. This workspace updates as your team closes the queue.</p>
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-3 text-[11px] font-semibold text-[#247c57]">
              <CheckCircle2 size={15} /> All connected sources are healthy
            </div>
          </section>
        </div>
      </div>
      {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#27333e] px-5 py-3 text-[12px] text-white shadow-xl" data-testid="status-section-toast">{toast}</div>}
    </AppShell>
  );
}

// --- Marketing Landing Page ---
function MarketingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#f7f5ef] text-[#1c2430]">
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#2d8cff] text-white shadow-[0_5px_18px_rgba(45,140,255,.25)]"><Link2 size={19} strokeWidth={2.5} /></span>
          <span className="text-[19px] font-semibold tracking-[-.03em]">Clear<span className="text-[#2d8cff]">Match</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <Link href="/sign-in" className="text-[13px] font-semibold text-[#5d6875] hover:text-[#1c2430]" data-testid="link-signin">Sign in</Link>
            <Link href="/sign-up" className="rounded-full bg-[#1c2430] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-[#2c3846]" data-testid="link-signup">Get started</Link>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="rounded-full bg-[#1c2430] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-[#2c3846]" data-testid="link-open-workspace">Open workspace</Link>
          </Show>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
          {/* subtle grid background */}
          <div className="absolute inset-0 quiet-grid pointer-events-none opacity-60" />
          
          <div className="relative mx-auto max-w-[1200px] px-6 md:px-12 text-center flex flex-col items-center">
            <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-[#d6d0c4] bg-white/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#626d79] backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-[#2d8cff]" /> Reconcile faster with Zoho Books
            </div>
            
            <h1 className="animate-rise delay-1 display mt-8 max-w-[800px] text-[56px] leading-[.95] tracking-[-.03em] md:text-[84px]">
              The calmest close <br className="hidden md:block" />
              <span className="text-[#687382]">your team has ever seen.</span>
            </h1>
            
            <p className="animate-rise delay-2 mt-8 max-w-[540px] text-[16px] leading-relaxed text-[#5f6b78]">
              ClearMatch perfectly aligns your bank statements with Zoho Books invoices. Stop cross-referencing spreadsheets and start making decisions.
            </p>
            
            <div className="animate-rise delay-3 mt-10 flex flex-col sm:flex-row items-center gap-4">
              <Show when="signed-out">
                <Link href="/sign-up" className="flex items-center justify-center rounded-full bg-[#2d8cff] px-8 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(45,140,255,.25)] transition hover:bg-[#1877e4]" data-testid="hero-signup">
                  Start your workspace
                </Link>
                <Link href="/sign-in" className="flex items-center justify-center rounded-full border border-[#d2cebf] bg-white px-8 py-3.5 text-[14px] font-semibold text-[#303b47] transition hover:bg-[#f2efe7]" data-testid="hero-signin">
                  Sign in to your account
                </Link>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="flex items-center justify-center rounded-full bg-[#2d8cff] px-8 py-3.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(45,140,255,.25)] transition hover:bg-[#1877e4]" data-testid="hero-open-workspace">
                  Continue to your workspace
                </Link>
              </Show>
            </div>
          </div>

          {/* Hero Mockup */}
          <div className="animate-rise delay-3 relative mx-auto mt-20 max-w-[1100px] px-6">
            <div className="relative rounded-2xl border border-[#e4e0d7] bg-white p-2 shadow-[0_30px_80px_rgba(35,43,54,.08)] md:p-4">
               {/* Simplified Mockup Dashboard */}
               <div className="rounded-xl border border-[#ece8df] bg-[#faf9f5] overflow-hidden">
                 <header className="flex h-14 items-center justify-between border-b border-[#ece8df] bg-white px-5">
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[12px] text-[#26313e] font-medium"><LayoutDashboard size={14} className="text-[#a5acb3]" /> Overview</div>
                      <div className="flex items-center gap-2 text-[12px] text-[#8e959b]"><FileSpreadsheet size={14} className="text-[#a5acb3]" /> Invoices</div>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="size-6 rounded-full bg-[#d8f1e7] flex items-center justify-center text-[#19774e]"><Building2 size={12} /></div>
                     <span className="hidden sm:inline text-[11px] font-medium text-[#4a545e]">Zoho Books Connected</span>
                   </div>
                 </header>
                 <div className="p-5 md:p-8 grid gap-6 lg:grid-cols-[1fr_300px]">
                   <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <h3 className="text-[14px] font-semibold text-[#273341]">Recent receipts</h3>
                       <span className="text-[11px] text-[#247ce0] font-medium flex items-center gap-1">View all <ArrowUpRight size={12}/></span>
                     </div>
                     <div className="rounded-xl border border-[#e4e0d7] bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left min-w-[500px]">
                            <thead>
                              <tr className="border-b border-[#efede8] text-[10px] font-semibold uppercase tracking-[.12em] text-[#9ba0a4]">
                                <th className="px-5 py-3">Customer</th>
                                <th className="px-5 py-3 text-right">Amount</th>
                                <th className="px-5 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {receiptRows.slice(0, 3).map((row, i) => (
                                <tr key={i} className="border-b border-[#f0eee9] last:border-0">
                                  <td className="px-5 py-3">
                                    <div className="text-[12px] font-semibold text-[#303a46]">{row.name}</div>
                                    <div className="mono mt-0.5 text-[10px] text-[#9a9fa4]">{row.reference}</div>
                                  </td>
                                  <td className="px-5 py-3 text-right mono text-[12px] font-medium text-[#303a46]">{row.amount}</td>
                                  <td className="px-5 py-3"><StatusPill status={row.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                     </div>
                   </div>
                   <div className="space-y-4">
                     <div className="rounded-xl border border-[#e4e0d7] bg-[#f0eee7] p-5">
                       <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.17em] text-[#8a8b87]"><Zap size={12} className="text-[#2d8cff]" /> Focus for today</div>
                       <h2 className="mt-3 text-[18px] font-semibold leading-tight tracking-[-.04em] text-[#2a3541]">Clear the last<br /><span className="display text-[24px] font-normal italic">loose ends.</span></h2>
                       <div className="mt-6 flex items-end justify-between">
                         <div><div className="mono text-[24px] tracking-[-.07em] text-[#263441]">12</div><div className="mt-0.5 text-[10px] text-[#7f8587]">needs review</div></div>
                         <div className="text-right"><div className="mono text-[12px] text-[#606b72]">₹3,64,980</div></div>
                       </div>
                       <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#dadbd5]"><div className="h-full w-[78%] rounded-full bg-[#e5a155]" /></div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* Feature Section: Editorial Layout */}
        <section className="bg-[#242b35] py-24 text-[#f6f4ee]">
          <div className="mx-auto max-w-[1200px] px-6 md:px-12 grid gap-16 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#86baff]"><Building2 size={14} /> Built for Zoho Books</div>
              <h2 className="display text-[42px] leading-[1] md:text-[52px]">Invoices and bank movement, perfectly matched.</h2>
              <p className="mt-6 text-[15px] leading-relaxed text-[#a8b4c0] max-w-[480px]">
                We pull your open invoices straight from Zoho Books and match them with incoming bank statements. Our intelligent reconciliation engine surfaces exact matches and highlights partial payments, so your finance team operates with total precision.
              </p>
              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                 <div>
                   <div className="flex items-center gap-2 font-semibold text-white"><CheckCircle2 size={16} className="text-[#72d0a6]" /> High confidence</div>
                   <p className="mt-2 text-[12px] text-[#8997a5]">Exact matches are processed instantly, reducing manual verification.</p>
                 </div>
                 <div>
                   <div className="flex items-center gap-2 font-semibold text-white"><CircleAlert size={16} className="text-[#efb46c]" /> Smart review</div>
                   <p className="mt-2 text-[12px] text-[#8997a5]">Partial payments and ambiguous names are queued for a quick human decision.</p>
                 </div>
              </div>
            </div>
            <div className="relative">
              {/* Visual representation of matching */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 bg-[#2d3641] p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] text-[#8ea0b2] font-mono mb-1">BANK STATEMENT</div>
                        <div className="text-[14px] font-semibold text-white">Bharat Forge Systems</div>
                        <div className="text-[12px] text-[#8ea0b2] mt-1 font-mono">HDFC •••• 7814</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-semibold text-white font-mono">₹2,84,500</div>
                        <div className="text-[11px] text-[#72d0a6] mt-1 flex items-center justify-end gap-1"><Check size={12} /> Received</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center -my-2 relative z-10">
                    <div className="grid size-8 place-items-center rounded-full border border-white/10 bg-[#1e252e] text-[#86baff]">
                       <Link2 size={14} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#72d0a6]/30 bg-[#1f302b] p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><FileSpreadsheet size={64} /></div>
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <div className="text-[10px] text-[#72d0a6] font-mono mb-1">ZOHO BOOKS INVOICE</div>
                        <div className="text-[14px] font-semibold text-[#e1f5eb]">INV-2406-087</div>
                        <div className="text-[12px] text-[#93c7b2] mt-1">Bharat Forge Systems</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-semibold text-[#e1f5eb] font-mono">₹2,84,500</div>
                        <div className="text-[11px] text-[#72d0a6] mt-1 font-semibold flex items-center justify-end gap-1"><CheckCircle2 size={12} /> 100% Match</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 text-center">
          <div className="mx-auto max-w-[600px] px-6">
            <h2 className="display text-[40px] leading-tight text-[#1c2430]">Bring calm back to your financial close.</h2>
            <p className="mt-5 text-[15px] text-[#636e7a]">Join Indian finance teams relying on ClearMatch to close their books perfectly, every time.</p>
            <div className="mt-8 flex items-center justify-center">
              <Show when="signed-out">
                <Link href="/sign-up" className="flex items-center justify-center rounded-full bg-[#1c2430] px-8 py-3.5 text-[14px] font-semibold text-white shadow-xl transition hover:bg-[#2c3846]" data-testid="footer-signup">
                  Create your free workspace
                </Link>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="flex items-center justify-center rounded-full bg-[#1c2430] px-8 py-3.5 text-[14px] font-semibold text-white shadow-xl transition hover:bg-[#2c3846]" data-testid="footer-open-workspace">
                  Open your workspace
                </Link>
              </Show>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e2ddd0] bg-[#f2efe7] py-10">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-[#2d8cff] text-white"><Link2 size={12} strokeWidth={2.5} /></span>
            <span className="text-[14px] font-semibold tracking-[-.02em] text-[#1c2430]">ClearMatch</span>
          </div>
          <p className="text-[12px] text-[#77818c]">© {new Date().getFullYear()} ClearMatch Workspace. Built for precision.</p>
        </div>
      </footer>
    </div>
  );
}

// --- Auth Routes ---
function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f5ef] quiet-grid px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/dashboard`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f5ef] quiet-grid px-4 py-12">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/dashboard`} />
    </div>
  );
}

function RequireAuth({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ZohoConnectionGate({ component: Component }: { component: React.ComponentType }) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('zoho') === 'connected') {
      queryClient.invalidateQueries({ queryKey: getGetZohoConnectionStatusQueryKey() });
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('zoho');
      window.history.replaceState({}, '', newUrl);
    }
  }, [queryClient]);

  const { data: status, isLoading, isError } = useGetZohoConnectionStatus();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f5ef] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 animate-rise">
           <span className="grid size-12 place-items-center rounded-[14px] bg-[#2d8cff] text-white shadow-[0_5px_18px_rgba(45,140,255,.25)]"><Link2 size={24} strokeWidth={2.5} /></span>
           <div className="text-[14px] font-medium text-[#77818c]">Loading workspace...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f5ef] flex flex-col items-center justify-center p-6 text-center">
         <div className="rounded-2xl border border-[#e4e0d7] bg-white p-6 max-w-[400px]">
           <CircleAlert size={32} className="text-[#e39b4f] mx-auto mb-4" />
           <h2 className="text-[18px] font-semibold text-[#1c2430]">Connection Error</h2>
           <p className="mt-2 text-[13px] text-[#636e7a]">We couldn't verify your workspace connection.</p>
           <button onClick={() => window.location.reload()} className="mt-5 w-full rounded-xl bg-[#2d8cff] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1877e4]">Retry</button>
         </div>
      </div>
    );
  }

  if (status && !status.connected) {
    return <Redirect to="/connect-zoho" />;
  }

  return <Component />;
}

function RequireZoho({ component: Component }: { component: React.ComponentType }) {
  return <RequireAuth component={() => <ZohoConnectionGate component={Component} />} />;
}

function ConnectZohoPage() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('zoho') === 'connected') {
      queryClient.invalidateQueries({ queryKey: getGetZohoConnectionStatusQueryKey() });
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('zoho');
      window.history.replaceState({}, '', newUrl);
    }
  }, [queryClient]);

  const { data: status, isLoading, isError } = useGetZohoConnectionStatus();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f5ef] flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 animate-rise">
           <span className="grid size-12 place-items-center rounded-[14px] bg-[#2d8cff] text-white shadow-[0_5px_18px_rgba(45,140,255,.25)]"><Link2 size={24} strokeWidth={2.5} /></span>
           <div className="text-[14px] font-medium text-[#77818c]">Loading workspace...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[100dvh] bg-[#f7f5ef] flex flex-col items-center justify-center p-6 text-center">
         <div className="rounded-2xl border border-[#e4e0d7] bg-white p-6 max-w-[400px] animate-rise">
           <CircleAlert size={32} className="text-[#e39b4f] mx-auto mb-4" />
           <h2 className="text-[18px] font-semibold text-[#1c2430]">Connection Error</h2>
           <p className="mt-2 text-[13px] text-[#636e7a]">We couldn't verify your workspace connection.</p>
           <button onClick={() => window.location.reload()} className="mt-5 w-full rounded-xl bg-[#2d8cff] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1877e4]">Retry</button>
         </div>
      </div>
    );
  }

  if (status?.connected) {
    return <Redirect to="/dashboard" />;
  }

  const returnTo = `${window.location.origin}${basePath}/dashboard`;
  const authUrl = `/api/integrations/zoho/authorize?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="min-h-[100dvh] bg-[#f7f5ef] quiet-grid text-[#1c2430] flex flex-col items-center justify-center px-5 py-12">
      <div className="max-w-[440px] w-full animate-rise">
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-3">
             <span className="grid size-10 place-items-center rounded-[12px] bg-[#2d8cff] text-white shadow-[0_5px_18px_rgba(45,140,255,.25)]"><Link2 size={20} strokeWidth={2.5} /></span>
             <span className="text-[20px] font-semibold tracking-[-.03em]">Clear<span className="text-[#7eb8ff]">Match</span></span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e4e0d7] bg-white p-8 md:p-10 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-[#2d8cff]"></div>
           <div className="flex justify-center mb-6">
              <span className="grid size-16 place-items-center rounded-2xl bg-[#d8f1e7] text-[#19774e] border border-[#c4e9d7] shadow-sm"><Building2 size={28} /></span>
           </div>
           
           <h1 className="text-center text-[22px] font-semibold tracking-[-.02em] text-[#1c2430]">Connect Zoho Books</h1>
           <p className="mt-3 text-center text-[13.5px] leading-relaxed text-[#636e7a]">
             ClearMatch needs access to your Zoho Books workspace to sync invoices and read payment data.
           </p>

           <div className="mt-8 space-y-3 bg-[#faf9f5] border border-[#ece9e2] rounded-xl p-5 shadow-inner">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-[#20815a] mt-0.5 shrink-0" />
                <div className="text-[13px] font-medium text-[#303b47]">Sync open and closed invoices</div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-[#20815a] mt-0.5 shrink-0" />
                 <div className="text-[13px] font-medium text-[#303b47]">Keep invoice status up to date</div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-[#20815a] mt-0.5 shrink-0" />
                <div className="text-[13px] font-medium text-[#303b47]">Automate your reconciliation workflow</div>
              </div>
           </div>

           <a href={authUrl} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2d8cff] py-3.5 text-[14px] font-semibold text-white shadow-[0_5px_15px_rgba(45,140,255,.18)] transition hover:bg-[#1877e4]">
             Connect workspace <ArrowUpRight size={16} />
           </a>
           
           <p className="mt-6 text-center text-[11px] text-[#8e959b]">
             You will be redirected to Zoho to approve access.
           </p>
        </div>
      </div>
    </div>
  );
}

// --- App Router & Setup ---

function Router() {
  return (
    <Switch>
      <Route path="/" component={MarketingPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/connect-zoho" component={() => <RequireAuth component={ConnectZohoPage} />} />
      <Route path="/dashboard" component={() => <RequireZoho component={DashboardPage} />} />
      <Route path="/reconciliation" component={() => <RequireZoho component={() => <SectionPage title="Reconciliation" kicker="Payment control" description="A focused queue for every receipt that needs a confident match, from bank movement to the right invoice." icon={ClipboardCheck} />} />} />
      <Route path="/invoices" component={() => <RequireZoho component={ZohoInvoicesPage} />} />
      <Route path="/bank-statements" component={() => <RequireZoho component={() => <SectionPage title="Bank statements" kicker="Source records" description="Bring statements into one dependable place and keep a clean line from imported movement to final decision." icon={Landmark} />} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome to ClearMatch", subtitle: "Sign in to access your workspace" } },
        signUp: { start: { title: "Create your workspace", subtitle: "Get started today" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <RoutedErrorBoundary>
            <Router />
          </RoutedErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;