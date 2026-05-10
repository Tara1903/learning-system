import bcrypt from "bcryptjs";

import { env } from "../../config/env.js";
import { UserModel } from "../../models/User.js";

export async function ensureSeedAdmin(): Promise<void> {
  if (!env.enableSeedAdminBootstrap) {
    return;
  }

  const existingAdmin = await UserModel.findOne({ role: "admin" });

  if (existingAdmin) {
    return;
  }

  const existingSeedUser = await UserModel.findOne({ email: env.seedAdminEmail.toLowerCase() });

  if (existingSeedUser) {
    throw new Error(
      `Seed admin bootstrap cannot continue because ${env.seedAdminEmail} already exists without an active admin role.`
    );
  }

  const password = await bcrypt.hash(env.seedAdminPassword, 10);

  await UserModel.create({
    name: env.seedAdminName,
    email: env.seedAdminEmail,
    password,
    role: "admin",
    isActive: true
  });
}
