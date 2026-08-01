import { Request, Response } from "express";
import { supabase } from "../config/db.js";

// GET /api/schedules - Admin gets all schedules, Student/Parent gets class-specific
export async function getSchedules(req: Request, res: Response) {
  const { user } = req;
  
  let query = supabase
    .from("schedules")
    .select(`
      *,
      teacher:teacher_id(name)
    `)
    .order("start_time", { ascending: true });

  if (user?.role === "student" && user.class) {
    query = query.eq("class", user.class);
  } else if (user?.role === "parent" && user.linked_student_id) {
    // Parent viewing for their linked child
    const { data: child } = await supabase
      .from("users")
      .select("class")
      .eq("id", user.linked_student_id)
      .single();
      
    if (child?.class) {
      query = query.eq("class", child.class);
    }
  }

  // Filter by date range if provided
  if (req.query.startDate) {
    query = query.gte("start_time", req.query.startDate as string);
  }
  if (req.query.endDate) {
    query = query.lte("end_time", req.query.endDate as string);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  res.json({ schedules: data });
}

// POST /api/schedules - Admin only
export async function createSchedule(req: Request, res: Response) {
  const { class: className, subject, teacher_id, start_time, end_time, type } = req.body;

  const { data, error } = await supabase
    .from("schedules")
    .insert({
      class: className,
      subject,
      teacher_id: teacher_id || null,
      start_time,
      end_time,
      type: type || "regular"
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.status(201).json({ schedule: data });
}

// DELETE /api/schedules/:id - Admin only
export async function deleteSchedule(req: Request, res: Response) {
  const { id } = req.params;

  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  res.json({ success: true });
}
