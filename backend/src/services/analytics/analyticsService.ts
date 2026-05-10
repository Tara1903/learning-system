import { AnalyticsModel } from "../../models/Analytics.js";
import { AttendanceModel } from "../../models/Attendance.js";
import { DoubtModel } from "../../models/Doubt.js";
import { PracticeSetModel } from "../../models/PracticeSet.js";
import type { PracticeQuestion } from "../../models/PracticeSet.js";
import { UserModel } from "../../models/User.js";
import type { WeakTopic } from "../../types/domain.js";

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
  const [attendance, doubts, practiceSets] = await Promise.all([
    AttendanceModel.find({ studentId }),
    DoubtModel.find({ studentId }),
    PracticeSetModel.find({ studentId })
  ]);

  const totalAttendance = attendance.length;
  const presentAttendance = attendance.filter((entry) => entry.status !== "absent").length;
  const attendancePercentage = totalAttendance
    ? Number(((presentAttendance / totalAttendance) * 100).toFixed(2))
    : 0;

  const allWeakTags = doubts.flatMap((doubt) => doubt.weakTopicTags);
  const weakTopics = aggregateWeakTopics(allWeakTags, doubts[0]?.subject ?? "general");
  const doubtCount = doubts.length;

  const answeredQuestions = practiceSets.flatMap((set) =>
    set.questions.filter(
      (question: PracticeQuestion) => question.status === "correct" || question.status === "incorrect"
    )
  );
  const correctQuestions = answeredQuestions.filter((question) => question.status === "correct").length;
  const practiceAccuracy = answeredQuestions.length
    ? Number(((correctQuestions / answeredQuestions.length) * 100).toFixed(2))
    : 0;

  const timestamps = [
    ...attendance.map((entry) => entry.updatedAt.getTime()),
    ...doubts.map((entry) => entry.updatedAt.getTime()),
    ...practiceSets.map((entry) => entry.updatedAt.getTime())
  ];

  const analytics = await AnalyticsModel.findOneAndUpdate(
    { studentId },
    {
      studentId,
      weakTopics,
      doubtCount,
      attendancePercentage,
      practiceAccuracy,
      lastActivityAt: timestamps.length ? new Date(Math.max(...timestamps)) : undefined
    },
    {
      upsert: true,
      new: true
    }
  );

  return analytics;
}

export async function getStudentAnalytics(studentId: string) {
  return (await AnalyticsModel.findOne({ studentId })) ?? recalculateStudentAnalytics(studentId);
}

export async function buildInstituteAnalytics() {
  const [users, analytics, attendanceCount, doubtCount] = await Promise.all([
    UserModel.find().select("role"),
    AnalyticsModel.find(),
    AttendanceModel.countDocuments(),
    DoubtModel.countDocuments()
  ]);

  const roleCounts = users.reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] ?? 0) + 1;
    return acc;
  }, {});

  const averageAttendance =
    analytics.length > 0
      ? Number(
          (analytics.reduce((sum, item) => sum + item.attendancePercentage, 0) / analytics.length).toFixed(2)
        )
      : 0;

  const weakTopicMap = new Map<string, number>();
  analytics.forEach((item) => {
    item.weakTopics.forEach((topic: WeakTopic) => {
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
    atRiskStudents: analytics.filter(
      (item) => item.attendancePercentage < 75 || (item.practiceAccuracy > 0 && item.practiceAccuracy < 60)
    ).length
  };
}
