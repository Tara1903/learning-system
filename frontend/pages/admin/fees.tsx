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

  interface ReceiptData {
    studentName: string;
    studentClass: string;
    feeTitle: string;
    amountPaid: number;
    paymentMethod: string;
    receiptNumber: string;
    date: string;
  }
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

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
      const selectedRecord = feeRecords.find(r => r.id === recordId);
      if (selectedRecord) {
        setReceiptData({
          studentName: selectedRecord.student?.name || "Unknown",
          studentClass: selectedRecord.student?.class || "N/A",
          feeTitle: selectedRecord.title,
          amountPaid: Number(paymentForm.amount),
          paymentMethod: paymentForm.payment_method,
          receiptNumber: paymentForm.receipt_number || "Auto-Generated",
          date: new Date().toLocaleDateString()
        });
      }
      
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

                      {success && receiptData && selectedRecordId === null && record.id === receiptData.feeTitle ? null : null}
                      {/* We will show print button inside the payment form area if they just paid */}

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
                            <div className="md:col-span-2 flex items-center justify-between">
                              <button
                                type="submit"
                                disabled={saving}
                                className="rounded-md bg-[var(--primary)] px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
                              >
                                {saving ? "Processing..." : "Confirm Payment"}
                              </button>
                            </div>
                            
                            {receiptData && success && !saving && (
                              <div className="md:col-span-2 mt-4 p-4 border border-green-200 bg-green-50 rounded-lg flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-green-800">Payment Successful</p>
                                  <p className="text-xs text-green-700 mt-1">The ledger has been updated.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => window.print()}
                                  className="rounded-md border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-green-50 flex items-center gap-2"
                                >
                                  🖨️ Print Receipt
                                </button>
                              </div>
                            )}
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
        <div className="space-y-6">
          <SectionCard title="Generate New Due">
            <form onSubmit={handleCreateFee} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">Student</label>
                <select
                  required
                  value={feeForm.student_id}
                  onChange={(e) => {
                    const studentId = e.target.value;
                    const student = students.find(s => s.id === studentId);
                    const feePlan = student?.profile?.feesPlan;
                    
                    let calculatedAmount = 0;
                    if (student && student.class) {
                      const BASE_FEE_MAP: Record<number, number> = {
                        1: 1100, 2: 1200, 3: 1300, 4: 1400, 5: 1500, 
                        6: 1600, 7: 1700, 8: 1800, 9: 1900, 10: 2000
                      };
                      
                      const studentClassNum = parseInt(student.class.replace(/\\D/g, '') || "0", 10);
                      const baseMonthlyFee = BASE_FEE_MAP[studentClassNum] || 0;
                      
                      let siblingDiscount = 0;
                      if (student.profile?.parentMobile) {
                        const hasOlderSibling = students.some(s => 
                          s.id !== student.id && 
                          s.profile?.parentMobile === student.profile?.parentMobile && 
                          parseInt(s.class?.replace(/\\D/g, '') || "0", 10) > studentClassNum
                        );
                        if (hasOlderSibling) {
                          siblingDiscount = 200;
                        }
                      }
                      
                      const adjustedMonthlyFee = Math.max(0, baseMonthlyFee - siblingDiscount);
                      
                      if (feePlan === "Yearly") {
                        calculatedAmount = adjustedMonthlyFee * 12 * 0.8;
                      } else if (feePlan === "Half-Yearly") {
                        calculatedAmount = adjustedMonthlyFee * 6 * 0.9;
                      } else if (feePlan === "Monthly") {
                        calculatedAmount = adjustedMonthlyFee * 1;
                      }
                    }
                    
                    setFeeForm({ 
                      ...feeForm, 
                      student_id: studentId,
                      amount_due: calculatedAmount ? calculatedAmount.toString() : ""
                    });
                  }}
                  className="w-full rounded-md border border-soft p-2"
                >
                  <option value="">Select a student...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Class {s.class})</option>
                  ))}
                </select>
              </div>

              {feeForm.student_id && (() => {
                const selectedStudent = students.find(s => s.id === feeForm.student_id);
                return selectedStudent ? (
                  <div className="rounded-md bg-surface-strong p-3 text-sm">
                    <p className="font-semibold mb-1">Billing Profile</p>
                    <div className="grid grid-cols-2 gap-2 text-text-main">
                      <p><span className="text-muted">Fees Plan:</span> {selectedStudent.profile?.feesPlan || "Not set"}</p>
                      <p><span className="text-muted">Discount:</span> {selectedStudent.profile?.discount || "None"}</p>
                      <p><span className="text-muted">Reg Fee:</span> {selectedStudent.profile?.registrationFee || "None"}</p>
                      <p><span className="text-muted">Receipt No:</span> {selectedStudent.profile?.receiptNo || "None"}</p>
                    </div>
                  </div>
                ) : null;
              })()}

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
      
      {/* Hidden Print Layout */}
      {receiptData && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-8 z-50 min-h-screen">
          <div className="max-w-2xl mx-auto border-2 border-gray-800 p-8">
            <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
              <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900">ADHYAYAN BRILLIANT CLASSES</h1>
              <p className="text-sm text-gray-600 mt-1">Anuradha Nagar, Tejaji Nagar | Call: 9202627229</p>
            </div>
            
            <h2 className="text-xl font-bold text-center underline mb-8 tracking-widest">FEE RECEIPT</h2>
            
            <div className="flex justify-between mb-8 text-sm font-medium">
              <div>
                <p><span className="text-gray-500 w-24 inline-block">Receipt No:</span> {receiptData.receiptNumber}</p>
                <p className="mt-2"><span className="text-gray-500 w-24 inline-block">Date:</span> {receiptData.date}</p>
              </div>
              <div className="text-right">
                <p><span className="text-gray-500 mr-2">Payment Method:</span> {receiptData.paymentMethod.toUpperCase()}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 p-6 mb-12">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <p><span className="text-gray-500 block mb-1">Student Name</span><span className="font-semibold text-lg">{receiptData.studentName}</span></p>
                <p><span className="text-gray-500 block mb-1">Class</span><span className="font-semibold text-lg">{receiptData.studentClass}</span></p>
                <p className="col-span-2 mt-4"><span className="text-gray-500 block mb-1">Fee Description</span><span className="font-medium text-base">{receiptData.feeTitle}</span></p>
              </div>
            </div>
            
            <div className="flex justify-between items-end border-t-2 border-gray-800 pt-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Amount Paid</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(receiptData.amountPaid)}</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-b border-gray-400 mb-2"></div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Authorized Signatory</p>
              </div>
            </div>
            
            <div className="mt-16 text-center text-xs text-gray-400 italic">
              Thank you for choosing Adhyayan Brilliant Classes!
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
