import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  useGetBankConnectionStatus, 
  useConnectDemoBankAccount, 
  useDisconnectBankAccount, 
  useImportDemoBankTransactions, 
  getGetBankConnectionStatusQueryKey,
  getListBankTransactionsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Search, Building2, Landmark, ChevronRight, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, ShieldCheck, AlertCircle, Link2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BANKS = [
  { id: 'hdfc', name: 'HDFC Bank', demo: true, last4: '4821' },
  { id: 'icici', name: 'ICICI Bank', demo: true, last4: '7392' },
  { id: 'sbi', name: 'State Bank of India', demo: false },
  { id: 'axis', name: 'Axis Bank', demo: false },
  { id: 'kotak', name: 'Kotak Mahindra Bank', demo: false },
  { id: 'indusind', name: 'IndusInd Bank', demo: false },
  { id: 'yes', name: 'Yes Bank', demo: false },
  { id: 'idfc', name: 'IDFC FIRST Bank', demo: false },
  { id: 'federal', name: 'Federal Bank', demo: false },
];

export function ConnectBankPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: bankStatus, isLoading: statusLoading } = useGetBankConnectionStatus();
  
  const [step, setStep] = useState<'intro' | 'manage' | 'select' | 'confirm' | 'importing' | 'success'>('intro');
  const [statusInitialized, setStatusInitialized] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<typeof BANKS[0] | null>(null);

  const connectMutation = useConnectDemoBankAccount({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetBankConnectionStatusQueryKey() });
        setStep('manage');
        toast({ title: 'Account connected successfully' });
      },
      onError: () => {
        toast({ title: 'Failed to connect account', variant: 'destructive' });
      }
    }
  });

  const disconnectMutation = useDisconnectBankAccount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBankConnectionStatusQueryKey() });
        toast({ title: 'Account disconnected' });
      }
    }
  });

  const importMutation = useImportDemoBankTransactions({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBankConnectionStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListBankTransactionsQueryKey() });
        window.setTimeout(() => setStep('success'), 1200);
      },
      onError: () => {
        setStep('manage');
        toast({ title: 'Failed to import transactions', variant: 'destructive' });
      }
    }
  });

  useEffect(() => {
    if (!bankStatus || statusInitialized) return;
    if (bankStatus.onboardingComplete) {
      setStep('success');
    } else if (bankStatus.accounts.length > 0) {
      setStep('manage');
    } else {
      setStep('intro');
    }
    setStatusInitialized(true);
  }, [bankStatus, statusInitialized]);

  const filteredBanks = BANKS.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  const handleConnect = () => {
    if (selectedBank && selectedBank.demo) {
      connectMutation.mutate({ data: { institutionId: selectedBank.id as 'hdfc' | 'icici' } });
    }
  };

  const handleImport = () => {
    setStep('importing');
    importMutation.mutate();
  };

  const handleDisconnect = (accountId: string) => {
    const disconnectingLastAccount = (bankStatus?.accounts.length ?? 0) <= 1;
    disconnectMutation.mutate(
      { accountId },
      { onSuccess: () => disconnectingLastAccount && setStep('intro') },
    );
  };

  const renderIntro = () => (
    <div className="animate-rise flex flex-col items-center text-center">
      <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-[#eaf2fb] text-[#2d78c6]">
        <Landmark size={27} strokeWidth={1.7} />
      </div>
      <div className="rounded-full border border-[#cfe1f2] bg-[#edf6ff] px-3 py-1 text-[9px] font-semibold uppercase tracking-[.14em] text-[#2674b9]">Step 4 of 4 · Demo</div>
      <h1 className="mt-5 font-serif text-[36px] leading-tight tracking-[-.025em] text-[#1c2430]">Connect your bank accounts</h1>
      <p className="mt-4 max-w-[460px] text-[14px] leading-6 text-[#65717d]">
        We'll import your transactions and match payments against your Zoho Books invoices.
      </p>
      <div className="mt-8 max-w-[440px] rounded-2xl border border-[#dfe4e8] bg-white p-5 text-left shadow-[0_8px_30px_rgba(0,0,0,.04)]">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#21815a]" />
          <div>
            <div className="text-[13px] font-semibold text-[#273341]">Safe prototype connection</div>
            <p className="mt-1 text-[11px] leading-5 text-[#77838e]">No real bank credentials are requested. HDFC and ICICI use clearly labelled mock business accounts.</p>
          </div>
        </div>
      </div>
      <button onClick={() => setStep('select')} className="mt-8 flex items-center gap-2 rounded-xl bg-[#2d8cff] px-7 py-3.5 text-[13px] font-semibold text-white shadow-[0_5px_15px_rgba(45,140,255,.18)] hover:bg-[#1877e4]" data-testid="button-start-bank-connection">
        Connect bank account <ArrowRight size={16} />
      </button>
    </div>
  );

  const renderSelect = () => (
    <div className="animate-rise flex flex-col items-center">
      <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-[#e8eaf0] text-[#4b5563]">
        <Landmark size={24} strokeWidth={1.5} />
      </div>
      <h1 className="text-center font-serif text-[32px] leading-tight tracking-[-.02em] text-[#1c2430]">
        Connect your bank
      </h1>
      <p className="mt-3 max-w-[380px] text-center text-[13px] leading-5 text-[#65717d]">
        Select your primary business account to start automatically importing your financial movement.
      </p>

      <div className="mt-8 w-full max-w-[420px] rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,.04)]">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-3 text-[#a1abb3]" />
          <input
            autoFocus
            type="text"
            placeholder="Search Indian banks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#d2d8de] bg-[#f9fafc] py-2.5 pl-10 pr-4 text-[13px] outline-none transition focus:border-[#2d8cff] focus:bg-white focus:ring-2 focus:ring-[#2d8cff]/20"
            data-testid="input-search-banks"
          />
        </div>

        <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
          {filteredBanks.map(bank => (
            <button
              key={bank.id}
              onClick={() => {
                if (bank.demo) {
                  setSelectedBank(bank);
                  setStep('confirm');
                } else {
                  toast({ title: 'Demo not available for this bank', description: 'Please select HDFC or ICICI for the demo.' });
                }
              }}
              className="flex w-full items-center justify-between rounded-xl border border-transparent p-3 text-left transition hover:bg-[#f3f5f8]"
              data-testid={`button-select-bank-${bank.id}`}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-white border border-[#e1e5ea] text-[#334155] shadow-sm">
                  <Building2 size={15} />
                </span>
                <span className="text-[13px] font-semibold text-[#273341]">{bank.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {bank.demo && (
                  <span className="rounded-full bg-[#ebf4ff] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.1em] text-[#2d8cff]">
                    Demo
                  </span>
                )}
                <ChevronRight size={16} className="text-[#a1abb3]" />
              </div>
            </button>
          ))}
          {filteredBanks.length === 0 && (
            <div className="py-8 text-center text-[12px] text-[#7d8790]">No banks found matching "{search}"</div>
          )}
        </div>
      </div>
      
      {bankStatus && bankStatus.accounts.length > 0 && (
        <button 
          onClick={() => { setSelectedBank(null); setStep('manage'); }}
          className="mt-6 text-[12px] font-semibold text-[#65717d] hover:text-[#1c2430]"
        >
          Cancel and return
        </button>
      )}
    </div>
  );

  const renderConfirm = () => (
    <div className="animate-rise flex flex-col items-center">
      <div className="mb-8 w-full max-w-[460px]">
        <button 
          onClick={() => setStep('select')} 
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[#65717d] hover:text-[#1c2430]"
        >
          <ArrowLeft size={14} /> Back to search
        </button>
      </div>

      <h1 className="text-center font-serif text-[32px] leading-tight tracking-[-.02em] text-[#1c2430]">
        Confirm demo account
      </h1>
      <p className="mt-3 max-w-[400px] text-center text-[13px] leading-5 text-[#65717d]">
        You are connecting a simulated workspace account. No real banking credentials are required.
      </p>

      <div className="mt-8 w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-[0_8px_30px_rgba(0,0,0,.04)]">
        <div className="border-b border-[#f1f3f5] bg-[#fafbfc] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white border border-[#e1e5ea] text-[#334155] shadow-sm">
              <Building2 size={18} />
            </span>
            <div>
              <div className="text-[15px] font-semibold text-[#1c2430]">{selectedBank?.name}</div>
              <div className="flex items-center gap-1 text-[11px] font-medium text-[#21815a]">
                <ShieldCheck size={12} /> Secure demo connection
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="rounded-xl border border-[#e6eaf0] p-4">
            <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#7d8790]">Account to connect</div>
            <div className="mt-2 flex items-center justify-between">
              <div className="font-mono text-[14px] text-[#1c2430]">
                Current Account <span className="text-[#a1abb3]">••••</span> {selectedBank?.last4}
              </div>
              <span className="rounded bg-[#e8f5ee] px-2 py-0.5 text-[10px] font-semibold text-[#18784e]">Ready</span>
            </div>
          </div>

          <button 
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2d8cff] py-3.5 text-[13px] font-semibold text-white shadow-[0_5px_15px_rgba(45,140,255,.18)] transition hover:bg-[#1877e4] disabled:opacity-70"
            data-testid="button-confirm-demo-account"
          >
             {connectMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : 'Connect account'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderManage = () => (
    <div className="animate-rise flex flex-col items-center">
      <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-[#eaf5ef] text-[#21815a]">
        <CheckCircle2 size={26} strokeWidth={2} />
      </div>
      <h1 className="text-center font-serif text-[32px] leading-tight tracking-[-.02em] text-[#1c2430]">
        Accounts connected
      </h1>
      <p className="mt-3 max-w-[420px] text-center text-[13px] leading-5 text-[#65717d]">
        Your business bank accounts are linked. You can import recent transactions to start matching them against your books.
      </p>

      <div className="mt-8 w-full max-w-[500px]">
        <div className="space-y-3">
          {bankStatus?.accounts.map(account => (
            <div key={account.accountId} className="flex flex-col rounded-2xl border border-[#dfe4e8] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,.03)] sm:flex-row sm:items-center sm:justify-between" data-testid={`card-account-${account.accountId}`}>
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f8f9fa] border border-[#e8eaed] text-[#4b5563]">
                  <Building2 size={18} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[#1c2430]">{account.institutionName}</span>
                    <span className="rounded-full bg-[#f1f3f5] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.1em] text-[#65717d]">{account.accountType}</span>
                  </div>
                  <div className="mt-1 font-mono text-[12px] text-[#65717d]">
                    •••• {account.last4}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-[#8a949d]">
                    <span className="flex items-center gap-1 text-[#21815a]"><CheckCircle2 size={12} /> {account.status}</span>
                    <span>•</span>
                    <span>Synced {new Date(account.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#f1f3f5] pt-4 sm:mt-0 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                <div className="font-mono text-[16px] font-semibold tracking-tight text-[#1c2430]">
                  {Number(account.currentBalance).toLocaleString('en-IN', { style: 'currency', currency: account.currencyCode, minimumFractionDigits: 0 })}
                </div>
                <button 
                   onClick={() => handleDisconnect(account.accountId)}
                  disabled={disconnectMutation.isPending}
                  className="mt-1 text-[11px] font-medium text-[#ef4444] hover:text-[#dc2626] disabled:opacity-50"
                  data-testid={`button-disconnect-${account.accountId}`}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => { setSelectedBank(null); setStep('select'); }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] py-3.5 text-[13px] font-semibold text-[#475569] transition hover:border-[#94a3b8] hover:bg-white"
          data-testid="button-add-another-account"
        >
          <Building2 size={16} /> + Connect another bank account
        </button>

        <div className="mt-8 rounded-2xl border border-[#cbe1f7] bg-[#f2f8fc] p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#2d8cff]" />
            <div>
              <div className="text-[13px] font-semibold text-[#1a385b]">Ready to reconcile</div>
              <p className="mt-1 text-[12px] leading-5 text-[#3a5879]">
                Import the simulated transaction history to match against your Zoho Books invoices.
              </p>
            </div>
          </div>
          <button 
            onClick={handleImport}
            className="mt-5 w-full rounded-xl bg-[#2d8cff] py-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#1877e4]"
            data-testid="button-import-transactions"
          >
            Import Transactions
          </button>
        </div>
      </div>
    </div>
  );

  const renderImporting = () => (
    <div className="animate-rise flex flex-col items-center py-10">
      <div className="relative mb-8 grid size-20 place-items-center">
        <div className="absolute inset-0 animate-ping rounded-full border-[3px] border-transparent border-t-[#2d8cff] border-r-[#2d8cff] opacity-80" style={{ animationDuration: '1.5s' }} />
        <RefreshCw size={32} className="animate-spin text-[#2d8cff]" style={{ animationDuration: '3s' }} />
      </div>
      <h1 className="text-center font-serif text-[28px] leading-tight tracking-[-.02em] text-[#1c2430]">
        Importing transactions...
      </h1>
      <p className="mt-3 max-w-[320px] text-center text-[13px] leading-5 text-[#65717d]">
        Securely fetching historical movement and preparing your reconciliation workspace.
      </p>
    </div>
  );

  const renderSuccess = () => (
    <div className="animate-rise flex flex-col items-center py-6">
      <div className="mb-6 grid size-16 place-items-center rounded-full bg-[#21815a]">
        <CheckCircle2 size={32} strokeWidth={2.5} className="text-white" />
      </div>
      <h1 className="text-center font-serif text-[36px] leading-tight tracking-[-.02em] text-[#1c2430]">
        Workspace ready
      </h1>
      <p className="mt-3 max-w-[380px] text-center text-[14px] leading-relaxed text-[#65717d]">
        Successfully imported <strong className="font-semibold text-[#1c2430]">1,284 transactions</strong> across your connected accounts.
      </p>

      <div className="mt-10 flex flex-col gap-3 w-full max-w-[320px]">
        <button 
          onClick={() => setLocation('/bank-statements')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c2430] py-3.5 text-[13px] font-semibold text-white shadow-md transition hover:bg-[#2d3748]"
          data-testid="button-continue-bank-statements"
        >
          View Bank Statements <ArrowRight size={16} />
        </button>
        <button 
          onClick={() => setLocation('/dashboard')}
          className="flex w-full items-center justify-center rounded-xl py-3.5 text-[13px] font-semibold text-[#65717d] transition hover:bg-[#f1f3f5] hover:text-[#1c2430]"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="quiet-grid flex min-h-[100dvh] flex-col bg-[#f7f5ef] px-5 py-10 text-[#1c2430] md:py-12">
      <div className="mb-9 flex justify-center">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[12px] bg-[#2d8cff] text-white shadow-[0_5px_18px_rgba(45,140,255,.25)]">
            <Link2 size={20} strokeWidth={2.5} />
          </span>
          <span className="text-[20px] font-semibold tracking-[-.03em]">
            Clear<span className="text-[#7eb8ff]">Match</span>
          </span>
        </div>
      </div>

      <div className="mb-7 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#89929c]">
        <span className="grid size-5 place-items-center rounded-full bg-[#d8f1e7] text-[#19774e]">✓</span>
        <span>Zoho Books</span>
        <span className="h-px w-8 bg-[#d8d5ce]" />
        <span className="grid size-5 place-items-center rounded-full bg-[#2d8cff] text-white">4</span>
        <span className="text-[#2476c9]">Bank account</span>
      </div>

      <main className="flex flex-1 flex-col items-center justify-center pb-12">
        {statusLoading ? (
          <div className="flex flex-col items-center opacity-60">
            <RefreshCw size={24} className="animate-spin text-[#a1abb3]" />
            <div className="mt-4 text-[13px] text-[#65717d]">Checking connection status...</div>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            {step === 'select' && renderSelect()}
            {step === 'intro' && renderIntro()}
            {step === 'confirm' && renderConfirm()}
            {step === 'manage' && renderManage()}
            {step === 'importing' && renderImporting()}
            {step === 'success' && renderSuccess()}
          </div>
        )}
      </main>
    </div>
  );
}
