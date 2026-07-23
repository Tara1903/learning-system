import { supabase } from '../../config/db.js';
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
  const { data: parentsData, error } = await supabase
    .from('users')
    .select('id, linkedStudentId, linkedStudentIds')
    .eq('role', 'parent');

  if (error || !parentsData) {
    return;
  }

  const parents = parentsData.filter(p => 
    p.linkedStudentId === studentId || 
    (p.linkedStudentIds && Array.isArray(p.linkedStudentIds) && p.linkedStudentIds.includes(studentId))
  );

  if (!parents.length) {
    return;
  }

  await Promise.all(
    parents.map((parent) =>
      dispatchNotification({
        recipientId: String(parent.id),
        type: "parent-update",
        title,
        message,
        relatedEntityType,
        relatedEntityId
      })
    )
  );
}
