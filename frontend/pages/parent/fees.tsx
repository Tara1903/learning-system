import { useState } from "react";
import { LoadingPanel } from "@/components/LoadingPanel";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { SectionCard } from "@/components/SectionCard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import type { FeeRecord } from "@/utils/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function ParentFeesPage() {
  const { status } = useRequireAuth(["parent"]);

  const {
    data: feeData,
    error: loadError,
    mutate
  } = useApi<{ feeRecords: FeeRecord[] }>(
    status === "authenticated" ? `/fees` : null
  );

  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  if (status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading fee details..." />;
  }

  if (loadError) {
    return (
      <DashboardLayout title="Fee Management" subtitle="View outstanding balances and receipts">
        <LoadFailurePanel message={loadError.message} onRetry={() => void mutate()} />
      </DashboardLayout>
    );
  }

  const feeRecords = feeData?.feeRecords || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <DashboardLayout
      title="Fee Management"
      subtitle="View outstanding dues and past payment receipts."
    >
      <div className="max-w-4xl space-y-6">
        {feeRecords.length === 0 ? (
          <SectionCard title="Fee Records">
            <p className="text-sm text-text-light py-8 text-center">No fee records found for your child.</p>
          </SectionCard>
        ) : (
          feeRecords.map(record => {
            const dueDate = new Date(record.due_date).toLocaleDateString();
            const balance = Number(record.amount_due) - Number(record.amount_paid);
            
            let statusBadge = "bg-yellow-100 text-yellow-700";
            if (record.status === "paid") statusBadge = "bg-green-100 text-green-700";
            if (record.status === "partial") statusBadge = "bg-blue-100 text-blue-700";
            
            const isOverdue = record.status !== "paid" && new Date(record.due_date) < new Date();
            if (isOverdue) statusBadge = "bg-red-100 text-red-700";

            return (
              <SectionCard key={record.id} title={record.title}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-soft">
                  <div>
                    <h4 className="font-semibold text-lg">{formatCurrency(record.amount_due)}</h4>
                    <p className="text-sm text-text-light">Due Date: {dueDate}</p>
                    {isOverdue && <p className="text-xs font-semibold text-red-600 mt-1">OVERDUE</p>}
                  </div>
                  <div className="flex flex-col md:items-end gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusBadge}`}>
                      {isOverdue ? "OVERDUE" : record.status}
                    </span>
                    <p className="text-sm font-medium">
                      Paid: <span className="text-green-600">{formatCurrency(record.amount_paid)}</span>
                    </p>
                    {balance > 0 && (
                      <p className="text-sm font-bold text-[var(--danger)]">
                        Balance: {formatCurrency(balance)}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <button 
                    onClick={() => setSelectedRecord(selectedRecord === record.id ? null : record.id)}
                    className="text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    {selectedRecord === record.id ? "Hide Transaction History" : "View Transaction History"}
                  </button>
                  
                  {selectedRecord === record.id && (
                    <div className="mt-4 space-y-3 bg-gray-50 p-4 rounded-lg border border-soft">
                      <h5 className="text-sm font-semibold mb-2">Payment Receipts</h5>
                      {(!record.transactions || record.transactions.length === 0) ? (
                        <p className="text-sm text-text-light">No payments recorded yet.</p>
                      ) : (
                        record.transactions.map(tx => (
                          <div key={tx.id} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="font-medium text-text-main">{formatCurrency(tx.amount)} via {tx.payment_method.toUpperCase()}</p>
                              <p className="text-xs text-text-light">{new Date(tx.payment_date).toLocaleString()}</p>
                              {tx.receipt_number && <p className="text-xs text-text-light mt-0.5">Receipt: {tx.receipt_number}</p>}
                            </div>
                            <span className="text-green-600 font-semibold text-xs bg-green-100 px-2 py-1 rounded">Confirmed</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </SectionCard>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
