import bcrypt from "bcryptjs";

import { env } from "../../config/env.js";
import { supabase } from "../../config/db.js";

export async function ensureSeedAdmin(): Promise<void> {
  if (!env.enableSeedAdminBootstrap) {
    return;
  }

  const { data: existingAdmin } = await supabase.from("users").select("id").eq("role", "admin").limit(1).maybeSingle();

  if (existingAdmin) {
    return;
  }

  const { data: existingSeedUser } = await supabase.from("users").select("id").eq("email", env.seedAdminEmail.toLowerCase()).limit(1).maybeSingle();

  if (existingSeedUser) {
    throw new Error(
      `Seed admin bootstrap cannot continue because ${env.seedAdminEmail} already exists without an active admin role.`
    );
  }

  const password = await bcrypt.hash(env.seedAdminPassword, 10);

  await supabase.from("users").insert({
    name: env.seedAdminName,
    email: env.seedAdminEmail,
    password,
    role: "admin",
    isActive: true
  });
}
