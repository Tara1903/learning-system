import type { Request, Response } from "express";

import { UserModel } from "../models/User.js";
import { ok } from "../utils/http.js";

export async function getTeacherStudents(req: Request, res: Response): Promise<void> {
  const classFilter = req.query.class ? { class: String(req.query.class) } : {};
  const students = await UserModel.find({ role: "student", ...classFilter })
    .select("name email class profile")
    .sort({ class: 1, name: 1 });

  ok(res, {
    students: students.map((student) => ({
      id: String(student._id),
      name: student.name,
      email: student.email,
      class: student.class,
      profile: student.profile
    }))
  });
}
