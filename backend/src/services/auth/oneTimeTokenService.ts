import { createHash, randomBytes } from "node:crypto";

import { supabase } from "../../config/db.js";
import { ApiError } from "../../utils/http.js";

export type AuthTokenType = "invite" | "password-reset";

interface IssueTokenInput {
  userId: string;
  type: AuthTokenType;
  ttlMinutes: number;
  createdBy?: string;
}

export function hashOneTimeToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function issueOneTimeToken(input: IssueTokenInput): Promise<{
  rawToken: string;
  expiresAt: Date;
}> {
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + input.ttlMinutes * 60 * 1000);

  await supabase
    .from("auth_tokens")
    .update({ usedAt: new Date().toISOString() })
    .eq("userId", input.userId)
    .eq("type", input.type)
    .is("usedAt", null);

  await supabase.from("auth_tokens").insert({
    userId: input.userId,
    type: input.type,
    tokenHash: hashOneTimeToken(rawToken),
    createdBy: input.createdBy,
    expiresAt: expiresAt.toISOString()
  });

  return { rawToken, expiresAt };
}

export async function consumeOneTimeToken(type: AuthTokenType, rawToken: string) {
  const { data: token } = await supabase
    .from("auth_tokens")
    .select("*")
    .eq("type", type)
    .eq("tokenHash", hashOneTimeToken(rawToken))
    .is("usedAt", null)
    .gt("expiresAt", new Date().toISOString())
    .maybeSingle();

  if (!token) {
    throw new ApiError(400, "Invalid or expired token.");
  }

  await supabase
    .from("auth_tokens")
    .update({ usedAt: new Date().toISOString() })
    .eq("id", token.id);

  return token;
}
