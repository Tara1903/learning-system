import mongoose, { Schema } from "mongoose";

export type AuthTokenType = "invite" | "password-reset";

export interface AuthTokenDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: AuthTokenType;
  tokenHash: string;
  createdBy?: mongoose.Types.ObjectId;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const authTokenSchema = new Schema<AuthTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["invite", "password-reset"],
      required: true,
      index: true
    },
    tokenHash: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, required: true },
    usedAt: Date
  },
  {
    timestamps: true
  }
);

authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthTokenModel =
  mongoose.models.AuthToken || mongoose.model<AuthTokenDocument>("AuthToken", authTokenSchema);
