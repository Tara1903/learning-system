import { useState, FormEvent } from "react";
import { LoadingPanel } from "@/components/LoadingPanel";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { SectionCard } from "@/components/SectionCard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/utils/api";
import type { FeeRecord, ManagedUser } from "@/utils/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function AdminFeesPage() {
  const { status } = useRequireAuth(["admin"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // New Fee Record Form
  const [feeForm, setFeeForm] = useState({
    student_id: "",
    title: "",
    amount_due: "",
    due_date: ""
  });

  // Payment Transaction Form
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "cash" as const,
    receipt_number: "",
    notes: ""
  });

  const {
    data: feeData,
    error: loadError,
    mutate
  } = useApi<{ feeRecords: FeeRecord[] }>(
    status === "authenticated" ? `/fees` : null
  );

  const { data: studentsData } = useApi<{ users: ManagedUser[] }>(
    status === "authenticated" ? `/admin/users?role=student&pageSize=500` : null
  );

  const handleCreateFee = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch("/fees", {
        method: "POST",
        body: JSON.stringify({
          ...feeForm,
          amount_due: Number(feeForm.amount_due),
          due_date: new Date(feeForm.due_date).toISOString()
        })
      });
      setSuccess("Fee record created successfully!");
      setFeeForm({ student_id: "", title: "", amount_due: "", due_date: "" });
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create fee record.");
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e: FormEvent, recordId: string) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/fees/${recordId}/pay`, {
        method: "POST",
        body: JSON.stringify({
          ...paymentForm,
          amount: Number(paymentForm.amount)
        })
      });
      setSuccess("Payment recorded successfully!");
      setPaymentForm({ amount: "", payment_method: "cash", receipt_number: "", notes: "" });
      setSelectedRecordId(null);
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading fee management..." />;
  }

  if (loadError) {
    return (
      <DashboardLayout title="Fee Ledger" subtitle="Manage institute fees">
        <LoadFailurePanel message={loadError.message} onRetry={() => void mutate()} />
      </DashboardLayout>
    );
  }

  const feeRecords = feeData?.feeRecords || [];
  const students = studentsData?.users || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <DashboardLayout
      title="Fee Ledger"
      subtitle="Record manual payments, generate dues, and track outstanding balances."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: List of Dues */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="All Fee Records">
            {feeRecords.length === 0 ? (
              <p className="text-sm text-text-light">No fee records found.</p>
            ) : (
              <div className="space-y-4">
                {feeRecords.map(record => {
                  const dueDate = new Date(record.due_date).toLocaleDateString();
                  const balance = Number(record.amount_due) - Number(record.amount_paid);
                  
                  let statusBadge = "bg-yellow-100 text-yellow-700";
                  if (record.status === "paid") statusBadge = "bg-green-100 text-green-700";
                  if (record.status === "partial") statusBadge = "bg-blue-100 text-blue-700";
                  
                  const isOverdue = record.status !== "paid" && new Date(record.due_date) < new Date();
                  if (isOverdue) statusBadge = "bg-red-100 text-red-700";

                  return (
                    <div key={record.id} className="rounded-lg border border-soft p-4 shadow-sm bg-white">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{record.student?.name || "Unknown"} (Class {record.student?.class})</h4>
                          <p className="text-sm font-medium text-text-main mt-1">{record.title} - {formatCurrency(record.amount_due)}</p>
                          <p className="text-xs text-text-light">Due: {dueDate}</p>
                        </div>
                        <div className="flex flex-col md:items-end gap-2 text-right">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusBadge}`}>
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

                      <div className="flex gap-2 border-t border-soft pt-4">
                        <button 
                          onClick={() => setSelectedRecordId(selectedRecordId === record.id ? null : record.id)}
                          className="text-sm font-medium text-[var(--primary)] hover:underline"
                        >
                          {selectedRecordId === record.id ? "Cancel Action" : "Record Payment"}
                        </button>
                      </div>

                      {selectedRecordId === record.id && record.status !== "paid" && (
                        <div className="mt-4 bg-gray-50 p-4 rounded-md border border-soft">
                          <h5 className="text-sm font-semibold mb-3">Record Manual Payment</h5>
                          <form onSubmit={(e) => handleRecordPayment(e, record.id)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-main">Amount Received (₹)</label>
                              <input
                                type="number"
                                required
                                max={balance}
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                className="w-full rounded-md border border-soft p-2 text-sm"
                                placeholder={`Max: ${balance}`}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-main">Method</label>
                              <select
                                required
                                value={paymentForm.payment_method}
                                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as any })}
                                className="w-full rounded-md border border-soft p-2 text-sm"
                              >
                                <option value="cash">Cash</option>
                                <option value="cheque">Cheque</option>
                                <option value="upi">UPI / Online</option>
                                <option value="bank_transfer">Bank Transfer</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-main">Receipt / Txn No. (Optional)</label>
                              <input
                                type="text"
                                value={paymentForm.receipt_number}
                                onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                                className="w-full rounded-md border border-soft p-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-main">Notes (Optional)</label>
                              <input
                                type="text"
                                value={paymentForm.notes}
                                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                className="w-full rounded-md border border-soft p-2 text-sm"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <button
                                type="submit"
                                disabled={saving}
                                className="w-full rounded-md bg-[var(--primary)] py-2 text-sm font-medium text-white disabled:opacity-50"
                              >
                                {saving ? "Processing..." : "Confirm Payment"}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Generate New Fee */}
        <div>
          <SectionCard title="Generate New Due">
            <form onSubmit={handleCreateFee} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Student</label>
                <select
                  required
                  value={feeForm.student_id}
                  onChange={(e) => setFeeForm({ ...feeForm, student_id: e.target.value })}
                  className="w-full rounded-md border border-soft p-2"
                >
                  <option value="">Select a student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Class {s.class})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Title / Description</label>
                <input
                  type="text"
                  required
                  value={feeForm.title}
                  onChange={(e) => setFeeForm({ ...feeForm, title: e.target.value })}
                  className="w-full rounded-md border border-soft p-2"
                  placeholder="e.g. Term 1 Tuition Fee"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={feeForm.amount_due}
                  onChange={(e) => setFeeForm({ ...feeForm, amount_due: e.target.value })}
                  className="w-full rounded-md border border-soft p-2"
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Due Date</label>
                <input
                  type="date"
                  required
                  value={feeForm.due_date}
                  onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
                  className="w-full rounded-md border border-soft p-2"
                />
              </div>

              {error && <div className="text-sm text-[var(--danger)]">{error}</div>}
              {success && <div className="text-sm text-green-600">{success}</div>}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-[var(--primary)] py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Creating..." : "Generate Fee Due"}
              </button>
            </form>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
