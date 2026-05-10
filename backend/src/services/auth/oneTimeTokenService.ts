import { createHash, randomBytes } from "node:crypto";

import { AuthTokenModel, type AuthTokenType } from "../../models/AuthToken.js";
import { ApiError } from "../../utils/http.js";

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

  await AuthTokenModel.updateMany(
    {
      userId: input.userId,
      type: input.type,
      usedAt: { $exists: false }
    },
    {
      usedAt: new Date()
    }
  );

  await AuthTokenModel.create({
    userId: input.userId,
    type: input.type,
    tokenHash: hashOneTimeToken(rawToken),
    createdBy: input.createdBy,
    expiresAt
  });

  return { rawToken, expiresAt };
}

export async function consumeOneTimeToken(type: AuthTokenType, rawToken: string) {
  const token = await AuthTokenModel.findOne({
    type,
    tokenHash: hashOneTimeToken(rawToken),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() }
  });

  if (!token) {
    throw new ApiError(400, "Invalid or expired token.");
  }

  token.usedAt = new Date();
  await token.save();

  return token;
}
