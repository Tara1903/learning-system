import type { Request, Response } from "express";

import { supabase } from "../config/db.js";
import { ok } from "../utils/http.js";

export async function getTeacherStudents(req: Request, res: Response): Promise<void> {
  let query = supabase
    .from("users")
    .select("id, name, email, class, profile")
    .eq("role", "student")
    .order("class", { ascending: true })
    .order("name", { ascending: true });

  if (req.query.class) {
    query = query.eq("class", String(req.query.class));
  }

  const { data: students } = await query;

  ok(res, {
    students: students?.map((student) => ({
      id: String(student.id),
      name: student.name,
      email: student.email,
      class: student.class,
      profile: student.profile
    })) ?? []
  });
}
