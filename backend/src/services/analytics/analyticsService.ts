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

export async function getStudentsAnalytics(studentIds: string[]) {
  if (!studentIds.length) return new Map();
  const { data } = await supabase.from('analytics').select('*').in('student_id', studentIds);
  
  const analyticsMap = new Map((data || []).map((a: any) => [a.student_id, a]));
  
  const missingIds = studentIds.filter(id => !analyticsMap.has(id));
  if (missingIds.length > 0) {
    const results = await Promise.all(missingIds.map(id => recalculateStudentAnalytics(id)));
    results.forEach((res, i) => {
      if (res) analyticsMap.set(missingIds[i], res);
    });
  }
  
  return analyticsMap;
}



export async function buildInstituteAnalytics() {
  const { data, error } = await supabase.rpc('get_institute_analytics');
  
  if (error || !data) {
    // Fallback if RPC is not deployed yet
    return {
      roleCounts: {},
      attendanceCount: 0,
      doubtCount: 0,
      averageAttendance: 0,
      topWeakTopics: [],
      atRiskStudents: 0
    };
  }

  return {
    ...data,
    topWeakTopics: (data as any).topWeakTopics?.map((t: any) => ({
      topic: t.topic,
      count: Number(t.score)
    })) || []
  };
}
