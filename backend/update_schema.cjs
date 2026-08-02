const fs = require('fs');
let content = fs.readFileSync('supabase_schema.sql', 'utf8');

const replacements = [
  ['linked_student_id', '"linkedStudentId"'],
  ['linked_student_ids', '"linkedStudentIds"'],
  ['is_active', '"isActive"'],
  ['token_version', '"tokenVersion"'],
  ['failed_login_attempts', '"failedLoginAttempts"'],
  ['locked_until', '"lockedUntil"'],
  ['last_login_at', '"lastLoginAt"'],
  ['created_at', '"createdAt"'],
  ['updated_at', '"updatedAt"'],
  ['created_by', '"createdBy"'],
  ['student_id', '"studentId"'],
  ['weak_topics', '"weakTopics"'],
  ['doubt_count', '"doubtCount"'],
  ['attendance_percentage', '"attendancePercentage"'],
  ['practice_accuracy', '"practiceAccuracy"'],
  ['last_activity_at', '"lastActivityAt"'],
  ['marked_by', '"markedBy"'],
  ['actor_id', '"actorId"'],
  ['actor_role', '"actorRole"'],
  ['entity_type', '"entityType"'],
  ['entity_id', '"entityId"'],
  ['target_user_id', '"targetUserId"'],
  ['ip_address', '"ipAddress"'],
  ['user_agent', '"userAgent"'],
  ['request_id', '"requestId"'],
  ['user_id', '"userId"'],
  ['token_hash', '"tokenHash"'],
  ['expires_at', '"expiresAt"'],
  ['used_at', '"usedAt"'],
  ['owner_id', '"ownerId"'],
  ['owner_role', '"ownerRole"'],
  ['storage_driver', '"storageDriver"'],
  ['storage_key', '"storageKey"'],
  ['absolute_path', '"absolutePath"'],
  ['mime_type', '"mimeType"'],
  ['original_file_name', '"originalFileName"'],
  ['file_name', '"fileName"'],
  ['byte_size', '"byteSize"'],
  ['voice_transcript', '"voiceTranscript"'],
  ['weak_topic_tags', '"weakTopicTags"'],
  ['resolved_at', '"resolvedAt"'],
  ['recipient_id', '"recipientId"'],
  ['related_entity_type', '"relatedEntityType"'],
  ['related_entity_id', '"relatedEntityId"'],
  ['topic_tags', '"topicTags"'],
  ['completion_rate', '"completionRate"'],
  ['accuracy_percentage', '"accuracyPercentage"'],
  ['completed_questions', '"completedQuestions"'],
  ['completed_at', '"completedAt"'],
  ['last_attempted_at', '"lastAttemptedAt"'],
  ['teacher_id', '"teacherId"'],
  ['start_time', '"startTime"'],
  ['end_time', '"endTime"'],
  ['amount_due', '"amountDue"'],
  ['amount_paid', '"amountPaid"'],
  ['due_date', '"dueDate"'],
  ['fee_record_id', '"feeRecordId"'],
  ['payment_method', '"paymentMethod"'],
  ['payment_date', '"paymentDate"'],
  ['recorded_by', '"recordedBy"'],
  ['receipt_number', '"receiptNumber"']
];

for (const [snake, camel] of replacements) {
  content = content.split(snake).join(camel);
}

// Special case for the trigger
content = content.replace(/NEW\.updated_at/g, 'NEW."updatedAt"');

fs.writeFileSync('supabase_schema.sql', content);
console.log('Schema updated.');
