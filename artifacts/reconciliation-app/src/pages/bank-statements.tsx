import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { AppShell } from '../App';
import { useListBankTransactions, useGetBankConnectionStatus } from '@workspace/api-client-react';
import { Search, Filter, Download, ArrowUpRight, ArrowDownRight, RefreshCw, FileSpreadsheet, Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function BankStatementsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: transactions = [], isLoading: isLoadingTransactions } = useListBankTransactions();
  const { data: bankStatus } = useGetBankConnectionStatus();
  
  const [search, setSearch] = useState('');
  
  // A small helper to find which bank account this belongs to if we want to show logo/name
  const getAccountInfo = (accountId: string) => {
    return bankStatus?.accounts.find(a => a.accountId === accountId);
  };

  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const lower = search.toLowerCase();
    return transactions.filter(t => 
      t.description.toLowerCase().includes(lower) || 
      t.reference.toLowerCase().includes(lower) ||
      t.debit.includes(search) ||
      t.credit.includes(search)
    );
  }, [transactions, search]);

  return (
    <AppShell onImport={() => setLocation('/connect-bank')}>
      <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-10 md:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="display text-[32px] leading-tight tracking-[-.02em] text-[#1c2430] sm:text-[40px]">
              Bank statements
            </h1>
            <p className="mt-2 max-w-[430px] text-[13px] leading-6 text-[#65717d]">
              Review imported financial movement from your connected business accounts.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {(!bankStatus?.accounts || bankStatus.accounts.length === 0) && (
              <button 
                onClick={() => setLocation('/connect-bank')}
                className="flex items-center gap-2 rounded-xl bg-[#2d8cff] px-4 py-2.5 text-[12px] font-semibold text-white shadow-[0_5px_15px_rgba(45,140,255,.18)] transition hover:bg-[#1877e4]"
                data-testid="button-connect-bank"
              >
                <Building2 size={14} /> Connect Bank
              </button>
            )}
            <button className="flex items-center gap-2 rounded-xl border border-[#dfe4e8] bg-white px-4 py-2.5 text-[12px] font-semibold text-[#334155] shadow-sm transition hover:bg-[#f8fafc]">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="animate-rise overflow-hidden rounded-2xl border border-[#dfe4e8] bg-white shadow-[0_8px_30px_rgba(0,0,0,.03)]">
          <div className="flex flex-col gap-4 border-b border-[#f1f3f5] bg-[#fafbfc] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-[320px]">
              <Search size={15} className="absolute left-3.5 top-2.5 text-[#a1abb3]" />
              <input 
                type="text" 
                placeholder="Search description, ref or amount..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[#d2d8de] bg-white py-2 pl-9 pr-4 text-[12px] outline-none transition focus:border-[#2d8cff] focus:ring-1 focus:ring-[#2d8cff]/20"
                data-testid="input-search-transactions"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 rounded-lg border border-[#d2d8de] bg-white px-3 py-2 text-[12px] font-medium text-[#475569] hover:bg-[#f8fafc]">
                <Filter size={14} /> All Accounts
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-[#f1f3f5] bg-white text-[10px] font-bold uppercase tracking-[.1em] text-[#8a949d]">
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5 text-right">Debit (-)</th>
                  <th className="px-5 py-3.5 text-right">Credit (+)</th>
                  <th className="px-5 py-3.5 text-right">Balance</th>
                  <th className="px-6 py-3.5 text-right">Account</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTransactions ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#65717d]">
                      <RefreshCw size={20} className="mx-auto animate-spin text-[#a1abb3]" />
                      <div className="mt-3 text-[12px]">Loading transactions...</div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#f8fafc]">
                        <FileSpreadsheet size={20} className="text-[#94a3b8]" />
                      </div>
                      <div className="text-[14px] font-semibold text-[#1e293b]">No transactions found</div>
                      <div className="mt-1 text-[12px] text-[#64748b]">
                        {transactions.length === 0 
                          ? "You haven't imported any statements yet."
                          : "Try adjusting your search filters."}
                      </div>
                      {transactions.length === 0 && (
                        <button 
                          onClick={() => setLocation('/connect-bank')}
                          className="mt-5 text-[12px] font-semibold text-[#2d8cff] hover:text-[#1877e4]"
                        >
                          Connect a bank account to import →
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isCredit = Number(tx.credit) > 0;
                    const acctInfo = getAccountInfo(tx.accountId);
                    
                    return (
                      <tr key={tx.transactionId} className="group border-b border-[#f1f3f5] last:border-0 hover:bg-[#fafbfc]" data-testid={`row-tx-${tx.transactionId}`}>
                        <td className="px-6 py-4 text-[12px] font-medium text-[#475569]">
                          {new Date(tx.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`grid size-6 shrink-0 place-items-center rounded-full ${isCredit ? 'bg-[#ebf8f2] text-[#21815a]' : 'bg-[#fff1f2] text-[#e11d48]'}`}>
                              {isCredit ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                            </span>
                            <span className="truncate text-[13px] font-semibold text-[#1e293b]">{tx.description}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-mono text-[11px] tracking-tight text-[#64748b]">{tx.reference}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono text-[13px] text-[#1e293b]">
                            {Number(tx.debit) > 0 ? Number(tx.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono text-[13px] font-medium text-[#21815a]">
                            {Number(tx.credit) > 0 ? Number(tx.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono text-[13px] text-[#64748b]">
                            {Number(tx.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] font-medium text-[#475569]">{acctInfo?.institutionName || 'Unknown Bank'}</span>
                            <span className="font-mono text-[10px] text-[#94a3b8]">•••• {acctInfo?.last4 || tx.accountId.slice(-4)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#f1f3f5] bg-[#fafbfc] px-6 py-3">
              <span className="text-[11px] text-[#64748b]">
                Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <button className="rounded px-2 py-1 text-[11px] font-medium text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#475569]" disabled>Previous</button>
                <button className="rounded px-2 py-1 text-[11px] font-medium text-[#475569] hover:bg-[#f1f5f9]">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
