import { Request, Response } from "express";
import { supabase } from "../config/db.js";

// GET /api/fees - Admin gets all, Parent gets child's fees
export async function getFees(req: Request, res: Response) {
  const { user } = req;
  
  let query = supabase
    .from("fee_records")
    .select(`
      *,
      student:student_id(name, class, profile),
      transactions:fee_transactions(*)
    `)
    .order('dueDate', { ascending: false });

  if (user?.role === "parent") {
    if (!user.linked_student_id) {
      return res.json({ feeRecords: [] });
    }
    query = query.eq('studentId', user.linked_student_id);
  } else if (user?.role === "student") {
    query = query.eq('studentId', user.id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  res.json({ feeRecords: data });
}

// POST /api/fees - Admin creates a new fee due record
export async function createFeeRecord(req: Request, res: Response) {
  const { student_id, title, amount_due, due_date } = req.body;

  const { data, error } = await supabase
    .from("fee_records")
    .insert({
      student_id,
      title,
      amount_due,
      due_date
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.status(201).json({ feeRecord: data });
}

// POST /api/fees/:id/pay - Admin records a manual payment
export async function recordPayment(req: Request, res: Response) {
  const { id } = req.params;
  const { amount, payment_method, notes, receipt_number } = req.body;
  const { user } = req;

  // 1. Fetch current fee record
  const { data: feeRecord, error: fetchError } = await supabase
    .from("fee_records")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !feeRecord) {
    throw new Error("Fee record not found");
  }

  const newAmountPaid = Number(feeRecord.amount_paid) + Number(amount);
  let newStatus = "pending";
  if (newAmountPaid > 0) newStatus = "partial";
  if (newAmountPaid >= Number(feeRecord.amount_due)) newStatus = "paid";

  // 2. Insert transaction
  const { error: txError } = await supabase
    .from("fee_transactions")
    .insert({
      fee_record_id: id,
      amount,
      payment_method,
      recorded_by: user!.id,
      notes,
      receipt_number: receipt_number || null
    });

  if (txError) throw txError;

  // 3. Update fee record
  const { data: updatedRecord, error: updateError } = await supabase
    .from("fee_records")
    .update({
      amount_paid: newAmountPaid,
      status: newStatus
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) throw updateError;

  res.json({ success: true, feeRecord: updatedRecord });
}
