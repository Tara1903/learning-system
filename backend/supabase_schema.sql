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

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
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
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    linked_student_id UUID REFERENCES users(id) ON DELETE SET NULL,
    linked_student_ids UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    token_version INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    profile JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_role_class_name ON users(role, class, name);
CREATE INDEX idx_users_linked_student_ids ON users USING GIN(linked_student_ids);

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. Analytics Table
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    weak_topics JSONB DEFAULT '[]'::jsonb,
    doubt_count INTEGER DEFAULT 0,
    attendance_percentage REAL DEFAULT 0,
    practice_accuracy REAL DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_analytics_updated_at
BEFORE UPDATE ON analytics
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 3. Attendance Table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')),
    marked_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, date)
);

CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 4. AuditLog Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role TEXT CHECK (actor_role IN ('admin', 'teacher', 'student', 'parent')),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    request_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_target_user_id ON audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE TRIGGER update_audit_logs_updated_at
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 5. AuthToken Table
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('invite', 'password-reset')),
    token_hash TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_type ON auth_tokens(type);
CREATE INDEX idx_auth_tokens_expires_at ON auth_tokens(expires_at);

CREATE TRIGGER update_auth_tokens_updated_at
BEFORE UPDATE ON auth_tokens
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 6. UploadAsset Table
CREATE TABLE upload_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_role TEXT NOT NULL CHECK (owner_role IN ('admin', 'teacher', 'student', 'parent')),
    category TEXT NOT NULL CHECK (category IN ('images', 'audio')),
    storage_driver TEXT NOT NULL CHECK (storage_driver IN ('local', 's3')),
    storage_key TEXT NOT NULL,
    absolute_path TEXT,
    mime_type TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    byte_size BIGINT NOT NULL,
    transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_upload_assets_owner_id_created_at ON upload_assets(owner_id, created_at DESC);
CREATE INDEX idx_upload_assets_category ON upload_assets(category);

CREATE TRIGGER update_upload_assets_updated_at
BEFORE UPDATE ON upload_assets
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 7. Doubt Table
CREATE TABLE doubts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    subject TEXT NOT NULL,
    class TEXT NOT NULL,
    response TEXT,
    mode TEXT DEFAULT 'hint' CHECK(mode IN ('hint', 'step-by-step', 'simplify', 'reveal-answer')),
    messages JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    voice_transcript TEXT,
    weak_topic_tags TEXT[] DEFAULT '{}',
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_doubts_student_id_updated_at ON doubts(student_id, updated_at DESC);

CREATE TRIGGER update_doubts_updated_at
BEFORE UPDATE ON doubts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 8. Notification Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    related_entity_type TEXT,
    related_entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_read_created ON notifications(recipient_id, read, created_at DESC);

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 9. PracticeSet Table
CREATE TABLE practice_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic_tags TEXT[] DEFAULT '{}',
    questions JSONB DEFAULT '[]'::jsonb,
    completion_rate REAL DEFAULT 0,
    accuracy_percentage REAL DEFAULT 0,
    completed_questions INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_attempted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_practice_sets_student_id_updated_at ON practice_sets(student_id, updated_at DESC);

CREATE TRIGGER update_practice_sets_updated_at
BEFORE UPDATE ON practice_sets
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
-- 10. Schedules Table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL DEFAULT 'regular' CHECK (type IN ('regular', 'exam', 'holiday')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_schedules_class_start_time ON schedules(class, start_time);

CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON schedules
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 11. Fee Records Table (Ledger balances)
CREATE TABLE fee_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fee_records_student_id_due_date ON fee_records(student_id, due_date DESC);

CREATE TRIGGER update_fee_records_updated_at
BEFORE UPDATE ON fee_records
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 12. Fee Transactions Table (Individual payments)
CREATE TABLE fee_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_record_id UUID NOT NULL REFERENCES fee_records(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'cheque', 'upi', 'bank_transfer')),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    receipt_number TEXT UNIQUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fee_transactions_fee_record_id ON fee_transactions(fee_record_id);

CREATE TRIGGER update_fee_transactions_updated_at
BEFORE UPDATE ON fee_transactions
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_student_id ON analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_doubts_resolved_at ON doubts(resolved_at);

-- 10. RPCs for Analytics Aggregation
CREATE OR REPLACE FUNCTION get_institute_analytics()
RETURNS JSON AS $$
DECLARE
    role_counts JSON;
    avg_attendance REAL;
    at_risk_students INTEGER;
    top_weak_topics JSON;
    attendance_count BIGINT;
    doubt_count BIGINT;
BEGIN
    SELECT json_object_agg(role, count) INTO role_counts
    FROM (SELECT role, COUNT(*) as count FROM users GROUP BY role) t;

    SELECT COALESCE(AVG(attendance_percentage), 0) INTO avg_attendance
    FROM analytics;

    SELECT COUNT(*) INTO at_risk_students
    FROM analytics
    WHERE attendance_percentage < 75 OR (practice_accuracy > 0 AND practice_accuracy < 60);

    SELECT json_agg(row_to_json(t)) INTO top_weak_topics
    FROM (
        SELECT topic_val->>'topic' as topic, SUM((topic_val->>'confidence')::numeric) as score
        FROM analytics, jsonb_array_elements(weak_topics) as topic_val
        GROUP BY topic_val->>'topic'
        ORDER BY score DESC
        LIMIT 6
    ) t;

    SELECT COUNT(*) INTO attendance_count FROM attendance;
    SELECT COUNT(*) INTO doubt_count FROM doubts;

    RETURN json_build_object(
        'roleCounts', COALESCE(role_counts, '{}'::json),
        'averageAttendance', avg_attendance,
        'atRiskStudents', at_risk_students,
        'topWeakTopics', COALESCE(top_weak_topics, '[]'::json),
        'attendanceCount', attendance_count,
        'doubtCount', doubt_count
    );
END;
$$ LANGUAGE plpgsql;
