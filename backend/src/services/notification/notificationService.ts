import { UserModel } from "../../models/User.js";
import { dispatchNotification } from "./deliveryProviders.js";

interface NotificationInput {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export async function createNotification(input: NotificationInput) {
  await dispatchNotification(input);
}

export async function notifyLinkedParents(
  studentId: string,
  title: string,
  message: string,
  relatedEntityType?: string,
  relatedEntityId?: string
): Promise<void> {
  const parents = await UserModel.find({
    role: "parent",
    $or: [
      { linkedStudentId: studentId },
      { linkedStudentIds: studentId }
    ]
  }).select("_id");

  if (!parents.length) {
    return;
  }

  await Promise.all(
    parents.map((parent) =>
      dispatchNotification({
        recipientId: String(parent._id),
        type: "parent-update",
        title,
        message,
        relatedEntityType,
        relatedEntityId
      })
    )
  );
}
