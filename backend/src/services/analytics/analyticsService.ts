import { supabase } from "../../config/db.js";
import type { WeakTopic } from "../../types/domain.js";

export interface PracticeQuestion {
  prompt: string;
  answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  status: "pending" | "correct" | "incorrect";
  studentAnswer?: string;
  feedback?: string;
  answeredAt?: Date | string;
}


function aggregateWeakTopics(tags: string[], subject: string): WeakTopic[] {
  const topicMap = new Map<string, number>();

  for (const tag of tags) {
    topicMap.set(tag, (topicMap.get(tag) ?? 0) + 1);
  }

  return Array.from(topicMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({
      topic,
      subject,
      confidence: Number((Math.min(count / Math.max(tags.length, 1), 1)).toFixed(2))
    }));
}

export async function recalculateStudentAnalytics(studentId: string) {
  const [
    { data: attendance = [] },
    { data: doubts = [] },
    { data: practiceSets = [] }
  ] = await Promise.all([
    supabase.from('attendance').select('*').eq('student_id', studentId),
    supabase.from('doubts').select('*').eq('student_id', studentId),
    supabase.from('practice_sets').select('*').eq('student_id', studentId)
  ]);

  const totalAttendance = (attendance || []).length;
  const presentAttendance = (attendance || []).filter((entry) => entry.status !== "absent").length;
  const attendancePercentage = totalAttendance
    ? Number(((presentAttendance / totalAttendance) * 100).toFixed(2))
    : 0;

  const allWeakTags = (doubts || []).flatMap((doubt) => doubt.weakTopicTags);
  const weakTopics = aggregateWeakTopics(allWeakTags, (doubts || [])[0]?.subject ?? "general");
  const doubtCount = (doubts || []).length;

  const answeredQuestions = (practiceSets || []).flatMap((set) =>
    set.questions.filter(
      (question: PracticeQuestion) => question.status === "correct" || question.status === "incorrect"
    )
  );
  const correctQuestions = answeredQuestions.filter((question) => question.status === "correct").length;
  const practiceAccuracy = answeredQuestions.length
    ? Number(((correctQuestions / answeredQuestions.length) * 100).toFixed(2))
    : 0;

  const timestamps = [
    ...(attendance || []).map((entry: any) => new Date(entry.updated_at || entry.createdAt || 0).getTime()),
    ...(doubts || []).map((entry: any) => new Date(entry.updated_at || entry.createdAt || 0).getTime()),
    ...(practiceSets || []).map((entry: any) => new Date(entry.updated_at || entry.createdAt || 0).getTime())
  ].filter(t => !isNaN(t) && t > 0);

  const lastActivityAt = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined;
  
  const { data: analytics, error } = await supabase
    .from('analytics')
    .upsert({
      student_id: studentId,
      weak_topics: weakTopics,
      doubt_count: doubtCount,
      attendance_percentage: attendancePercentage,
      practice_accuracy: practiceAccuracy,
      last_activity_at: lastActivityAt
    }, { onConflict: 'student_id' })
    .select()
    .single();


  return analytics;
}

export async function getStudentAnalytics(studentId: string) {
  const { data } = await supabase.from('analytics').select('*').eq('student_id', studentId).single();
  return data ?? recalculateStudentAnalytics(studentId);
}

export async function buildInstituteAnalytics() {
  const [
    { data: users = [] },
    { data: analytics = [] },
    { count: attendanceCount },
    { count: doubtCount }
  ] = await Promise.all([
    supabase.from('users').select('role'),
    supabase.from('analytics').select('*'),
    supabase.from('attendance').select('*', { count: 'exact', head: true }),
    supabase.from('doubts').select('*', { count: 'exact', head: true })
  ]);

  const roleCounts = (users || []).reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] ?? 0) + 1;
    return acc;
  }, {});

  const averageAttendance =
    (analytics || []).length > 0
      ? Number(
          ((analytics || []).reduce((sum, item: any) => sum + (item.attendance_percentage || item.attendancePercentage || 0), 0) / (analytics || []).length).toFixed(2)
        )
      : 0;

  const weakTopicMap = new Map<string, number>();
  (analytics || []).forEach((item: any) => {
    (item.weak_topics || item.weakTopics || []).forEach((topic: WeakTopic) => {
      weakTopicMap.set(topic.topic, (weakTopicMap.get(topic.topic) ?? 0) + 1);
    });
  });

  const topWeakTopics = Array.from(weakTopicMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([topic, count]) => ({ topic, count }));

  return {
    roleCounts,
    attendanceCount,
    doubtCount,
    averageAttendance,
    topWeakTopics,
    atRiskStudents: (analytics || []).filter(
      (item: any) => {
        const att = item.attendance_percentage || item.attendancePercentage || 0;
        const acc = item.practice_accuracy || item.practiceAccuracy || 0;
        return att < 75 || (acc > 0 && acc < 60);
      }
    ).length
  };
}
