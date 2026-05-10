import mongoose, { Schema } from "mongoose";

export interface NotificationDocument extends mongoose.Document {
  recipientId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  read: boolean;
  relatedEntityType?: string;
  relatedEntityId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
    relatedEntityType: String,
    relatedEntityId: { type: Schema.Types.ObjectId }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification || mongoose.model<NotificationDocument>("Notification", notificationSchema);
