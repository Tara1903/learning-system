const fs = require('fs');

const replacements = [
  ['student_id', 'studentId'],
  ['voice_transcript', 'voiceTranscript'],
  ['weak_topic_tags', 'weakTopicTags'],
  ['resolved_at', 'resolvedAt'],
  ['marked_by', 'markedBy'],
  ['due_date', 'dueDate'],
  ['fee_record_id', 'feeRecordId'],
  ['recorded_by', 'recordedBy'],
  ['receipt_number', 'receiptNumber'],
  ['amount_paid', 'amountPaid'],
  ['start_time', 'startTime'],
  ['end_time', 'endTime'],
  ['teacher_id', 'teacherId'],
  ['topic_tags', 'topicTags'],
  ['completion_rate', 'completionRate'],
  ['accuracy_percentage', 'accuracyPercentage'],
  ['completed_questions', 'completedQuestions'],
  ['completed_at', 'completedAt'],
  ['last_attempted_at', 'lastAttemptedAt'],
  ['updated_at', 'updatedAt'],
  ['amount_due', 'amountDue'],
  ['payment_method', 'paymentMethod'],
  ['payment_date', 'paymentDate']
];

const files = [
  'src/controllers/aiController.ts',
  'src/controllers/attendanceController.ts',
  'src/controllers/feeController.ts',
  'src/controllers/scheduleController.ts',
  'src/services/ai/practiceService.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  replacements.forEach(([snake, camel]) => {
    // Replace property assignments/keys
    content = content.replace(new RegExp('\\\\b' + snake + '\\\\s*:', 'g'), camel + ':');
    // Replace string literals
    content = content.replace(new RegExp('[\'\"]' + snake + '[\'\"]', 'g'), "'" + camel + "'");
  });
  fs.writeFileSync(file, content);
});
console.log('Fixed snake cases');
