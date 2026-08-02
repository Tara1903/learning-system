-- Supabase PostgreSQL Schema

-- Enable UUID extension if not using gen_random_uuid() (though gen_random_uuid() is built-in for PG 13+)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables
DROP TABLE IF EXISTS practice_sets CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS doubts CASCADE;
DROP TABLE IF EXISTS upload_assets CASCADE;
DROP TABLE IF EXISTS auth_tokens CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Trigger function for "updatedAt"
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
    class TEXT,
    "createdBy" UUID REFERENCES users(id) ON DELETE SET NULL,
    "linkedStudentId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "linkedStudentIds" UUID[] DEFAULT '{}',
    "isActive" BOOLEAN DEFAULT true,
    "tokenVersion" INTEGER DEFAULT 0,
    "failedLoginAttempts" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMP WITH TIME ZONE,
    "lastLoginAt" TIMESTAMP WITH TIME ZONE,
    profile JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_role_class_name ON users(role, class, name);
CREATE INDEX idx_users_linkedStudentIds ON users USING GIN("linkedStudentIds");

CREATE TRIGGER update_users_updatedAt
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. Analytics Table
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    "weakTopics" JSONB DEFAULT '[]'::jsonb,
    "doubtCount" INTEGER DEFAULT 0,
    "attendancePercentage" REAL DEFAULT 0,
    "practiceAccuracy" REAL DEFAULT 0,
    "lastActivityAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_analytics_updatedAt
BEFORE UPDATE ON analytics
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 3. Attendance Table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')),
    "markedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("studentId", date)
);

CREATE TRIGGER update_attendance_updatedAt
BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 4. AuditLog Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "actorId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "actorRole" TEXT CHECK ("actorRole" IN ('admin', 'teacher', 'student', 'parent')),
    action TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "targetUserId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    details JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actorId ON audit_logs("actorId");
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entityType ON audit_logs("entityType");
CREATE INDEX idx_audit_logs_targetUserId ON audit_logs("targetUserId");
CREATE INDEX idx_audit_logs_createdAt ON audit_logs("createdAt" DESC);

CREATE TRIGGER update_audit_logs_updatedAt
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 5. AuthToken Table
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('invite', 'password-reset')),
    "tokenHash" TEXT NOT NULL UNIQUE,
    "createdBy" UUID REFERENCES users(id) ON DELETE SET NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "usedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_userId ON auth_tokens("userId");
CREATE INDEX idx_auth_tokens_type ON auth_tokens(type);
CREATE INDEX idx_auth_tokens_expiresAt ON auth_tokens("expiresAt");

CREATE TRIGGER update_auth_tokens_updatedAt
BEFORE UPDATE ON auth_tokens
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 6. UploadAsset Table
CREATE TABLE upload_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "ownerRole" TEXT NOT NULL CHECK ("ownerRole" IN ('admin', 'teacher', 'student', 'parent')),
    category TEXT NOT NULL CHECK (category IN ('images', 'audio')),
    "storageDriver" TEXT NOT NULL CHECK ("storageDriver" IN ('local', 's3')),
    "storageKey" TEXT NOT NULL,
    "absolutePath" TEXT,
    "mimeType" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "byteSize" BIGINT NOT NULL,
    transcript TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_upload_assets_ownerId_createdAt ON upload_assets("ownerId", "createdAt" DESC);
CREATE INDEX idx_upload_assets_category ON upload_assets(category);

CREATE TRIGGER update_upload_assets_updatedAt
BEFORE UPDATE ON upload_assets
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 7. Doubt Table
CREATE TABLE doubts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    subject TEXT NOT NULL,
    class TEXT NOT NULL,
    response TEXT,
    mode TEXT DEFAULT 'hint' CHECK(mode IN ('hint', 'step-by-step', 'simplify', 'reveal-answer')),
    messages JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    "voiceTranscript" TEXT,
    "weakTopicTags" TEXT[] DEFAULT '{}',
    "resolvedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_doubts_studentId_updatedAt ON doubts("studentId", "updatedAt" DESC);

CREATE TRIGGER update_doubts_updatedAt
BEFORE UPDATE ON doubts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 8. Notification Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "recipientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    "relatedEntityType" TEXT,
    "relatedEntityId" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_read_created ON notifications("recipientId", read, "createdAt" DESC);

CREATE TRIGGER update_notifications_updatedAt
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 9. PracticeSet Table
CREATE TABLE practice_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    "topicTags" TEXT[] DEFAULT '{}',
    questions JSONB DEFAULT '[]'::jsonb,
    "completionRate" REAL DEFAULT 0,
    "accuracyPercentage" REAL DEFAULT 0,
    "completedQuestions" INTEGER DEFAULT 0,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "lastAttemptedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_practice_sets_studentId_updatedAt ON practice_sets("studentId", "updatedAt" DESC);

CREATE TRIGGER update_practice_sets_updatedAt
BEFORE UPDATE ON practice_sets
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
-- 10. Schedules Table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class TEXT NOT NULL,
    subject TEXT NOT NULL,
    "teacherId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL DEFAULT 'regular' CHECK (type IN ('regular', 'exam', 'holiday')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schedules_class_startTime ON schedules(class, "startTime");

CREATE TRIGGER update_schedules_updatedAt
BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 11. Fee Records Table (Ledger balances)
CREATE TABLE fee_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    "amountDue" DECIMAL(10, 2) NOT NULL,
    "amountPaid" DECIMAL(10, 2) DEFAULT 0.00,
    "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fee_records_studentId_dueDate ON fee_records("studentId", "dueDate" DESC);

CREATE TRIGGER update_fee_records_updatedAt
BEFORE UPDATE ON fee_records
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 12. Fee Transactions Table (Individual payments)
CREATE TABLE fee_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "feeRecordId" UUID NOT NULL REFERENCES fee_records(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    "paymentMethod" TEXT NOT NULL CHECK ("paymentMethod" IN ('cash', 'cheque', 'upi', 'bank_transfer')),
    "paymentDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "recordedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    "receiptNumber" TEXT UNIQUE,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fee_transactions_feeRecordId ON fee_transactions("feeRecordId");

CREATE TRIGGER update_fee_transactions_updatedAt
BEFORE UPDATE ON fee_transactions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_studentId ON attendance("studentId");
CREATE INDEX IF NOT EXISTS idx_analytics_studentId ON analytics("studentId");
CREATE INDEX IF NOT EXISTS idx_doubts_resolvedAt ON doubts("resolvedAt");

-- 10. RPCs for Analytics Aggregation
CREATE OR REPLACE FUNCTION get_institute_analytics()
RETURNS JSON AS $$
DECLARE
    role_counts JSON;
    avg_attendance REAL;
    at_risk_students INTEGER;
    top_weakTopics JSON;
    attendance_count BIGINT;
    "doubtCount" BIGINT;
BEGIN
    SELECT json_object_agg(role, count) INTO role_counts
    FROM (SELECT role, COUNT(*) as count FROM users GROUP BY role) t;

    SELECT COALESCE(AVG("attendancePercentage"), 0) INTO avg_attendance
    FROM analytics;

    SELECT COUNT(*) INTO at_risk_students
    FROM analytics
    WHERE "attendancePercentage" < 75 OR ("practiceAccuracy" > 0 AND "practiceAccuracy" < 60);

    SELECT json_agg(row_to_json(t)) INTO top_weakTopics
    FROM (
        SELECT topic_val->>'topic' as topic, SUM((topic_val->>'confidence')::numeric) as score
        FROM analytics, jsonb_array_elements("weakTopics") as topic_val
        GROUP BY topic_val->>'topic'
        ORDER BY score DESC
        LIMIT 6
    ) t;

    SELECT COUNT(*) INTO attendance_count FROM attendance;
    SELECT COUNT(*) INTO "doubtCount" FROM doubts;

    RETURN json_build_object(
        'roleCounts', COALESCE(role_counts, '{}'::json),
        'averageAttendance', avg_attendance,
        'atRiskStudents', at_risk_students,
        'topWeakTopics', COALESCE(top_weakTopics, '[]'::json),
        'attendanceCount', attendance_count,
        'doubtCount', "doubtCount"
    );
END;
$$ LANGUAGE plpgsql;
