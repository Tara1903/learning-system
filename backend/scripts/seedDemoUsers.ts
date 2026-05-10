import bcrypt from "bcryptjs";

import { connectDatabase, disconnectDatabase, getActiveMongoUri } from "../src/config/db.js";
import { AttendanceModel } from "../src/models/Attendance.js";
import { DoubtModel } from "../src/models/Doubt.js";
import { NotificationModel } from "../src/models/Notification.js";
import { PracticeSetModel } from "../src/models/PracticeSet.js";
import { UserModel } from "../src/models/User.js";
import { recalculateStudentAnalytics } from "../src/services/analytics/analyticsService.js";

const demoAccounts = {
  admin: {
    name: "Demo Admin",
    email: "demo.admin@adhyayan.local",
    password: "DemoAdmin@123",
    role: "admin" as const
  },
  teacher: {
    name: "Demo Teacher",
    email: "demo.teacher@adhyayan.local",
    password: "DemoTeacher@123",
    role: "teacher" as const,
    profile: {
      phone: "9999000010",
      section: "STEM"
    }
  },
  student: {
    name: "Aarav Sharma",
    email: "demo.student@adhyayan.local",
    password: "DemoStudent@123",
    role: "student" as const,
    class: "10",
    profile: {
      section: "A",
      admissionNumber: "ADH-2026-010",
      guardianName: "Meera Sharma"
    }
  },
  parent: {
    name: "Meera Sharma",
    email: "demo.parent@adhyayan.local",
    password: "DemoParent@123",
    role: "parent" as const,
    profile: {
      phone: "9999000011",
      guardianName: "Aarav Sharma"
    }
  }
};

async function upsertUser(input: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "teacher" | "student" | "parent";
  class?: string;
  profile?: Record<string, string>;
  linkedStudentId?: string;
  linkedStudentIds?: string[];
}) {
  const hashedPassword = await bcrypt.hash(input.password, 12);

  return UserModel.findOneAndUpdate(
    { email: input.email.toLowerCase() },
    {
      name: input.name,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      role: input.role,
      class: input.class,
      profile: input.profile,
      linkedStudentId: input.linkedStudentId,
      linkedStudentIds: input.linkedStudentIds ?? [],
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: undefined
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

async function seedDemoData() {
  const admin = await upsertUser(demoAccounts.admin);
  const teacher = await upsertUser(demoAccounts.teacher);
  const student = await upsertUser(demoAccounts.student);
  const parent = await upsertUser({
    ...demoAccounts.parent,
    linkedStudentId: String(student._id),
    linkedStudentIds: [String(student._id)]
  });

  await Promise.all([
    AttendanceModel.deleteMany({ studentId: student._id }),
    DoubtModel.deleteMany({ studentId: student._id }),
    PracticeSetModel.deleteMany({ studentId: student._id }),
    NotificationModel.deleteMany({
      recipientId: {
        $in: [student._id, parent._id, teacher._id, admin._id]
      }
    })
  ]);

  const attendanceDates = [
    { date: "2026-05-02", status: "present" as const },
    { date: "2026-05-03", status: "present" as const },
    { date: "2026-05-04", status: "late" as const },
    { date: "2026-05-05", status: "present" as const },
    { date: "2026-05-06", status: "absent" as const },
    { date: "2026-05-07", status: "present" as const },
    { date: "2026-05-08", status: "present" as const }
  ];

  await AttendanceModel.insertMany(
    attendanceDates.map((entry) => ({
      studentId: student._id,
      class: "10",
      date: new Date(`${entry.date}T00:00:00.000Z`),
      status: entry.status,
      markedBy: teacher._id
    }))
  );

  const firstDoubt = await DoubtModel.create({
    studentId: student._id,
    question: "How do I factorize x^2 + 5x + 6?",
    subject: "Mathematics",
    class: "10",
    response:
      "Start by finding two numbers that multiply to 6 and add to 5. Try listing factor pairs before jumping to the final brackets.",
    mode: "hint",
    weakTopicTags: ["factorization", "quadratic expressions", "mathematics"],
    messages: [
      {
        role: "student",
        content: "How do I factorize x^2 + 5x + 6?",
        mode: "hint",
        createdAt: new Date("2026-05-08T10:00:00.000Z")
      },
      {
        role: "assistant",
        content:
          "Start by finding two numbers that multiply to 6 and add to 5. Try listing factor pairs before jumping to the final brackets.",
        mode: "hint",
        createdAt: new Date("2026-05-08T10:01:00.000Z")
      }
    ]
  });

  await DoubtModel.create({
    studentId: student._id,
    question: "Why does acceleration become negative in this graph?",
    subject: "Physics",
    class: "10",
    response:
      "Acceleration is negative when the velocity is decreasing over time in the chosen positive direction. Check the slope of the velocity-time graph first.",
    mode: "step-by-step",
    weakTopicTags: ["acceleration", "motion graphs", "physics"],
    resolvedAt: new Date("2026-05-09T12:18:00.000Z"),
    messages: [
      {
        role: "student",
        content: "Why does acceleration become negative in this graph?",
        mode: "step-by-step",
        createdAt: new Date("2026-05-09T12:10:00.000Z")
      },
      {
        role: "assistant",
        content:
          "Acceleration is negative when the velocity is decreasing over time in the chosen positive direction. Check the slope of the velocity-time graph first.",
        mode: "step-by-step",
        createdAt: new Date("2026-05-09T12:12:00.000Z")
      },
      {
        role: "student",
        content: "So the falling line means negative acceleration in that direction?",
        mode: "step-by-step",
        createdAt: new Date("2026-05-09T12:16:00.000Z")
      },
      {
        role: "assistant",
        content: "Exactly. The sign comes from direction, while the slope tells you how quickly velocity is changing.",
        mode: "step-by-step",
        createdAt: new Date("2026-05-09T12:18:00.000Z")
      }
    ]
  });

  const now = new Date("2026-05-09T18:00:00.000Z");

  await PracticeSetModel.create({
    studentId: student._id,
    subject: "Mathematics",
    topicTags: ["factorization", "quadratic expressions"],
    questions: [
      {
        prompt: "Factorize x^2 + 7x + 12.",
        answer: "(x + 3)(x + 4)",
        explanation: "Find two numbers that multiply to 12 and add to 7.",
        difficulty: "easy",
        status: "correct",
        studentAnswer: "(x+3)(x+4)",
        feedback: "Correct. You found the right pair of numbers.",
        answeredAt: now
      },
      {
        prompt: "Factorize x^2 + 8x + 15.",
        answer: "(x + 3)(x + 5)",
        explanation: "Look for two numbers that multiply to 15 and add to 8.",
        difficulty: "medium",
        status: "incorrect",
        studentAnswer: "(x+1)(x+15)",
        feedback: "Check the sum of your factors. They should add to 8, not 16.",
        answeredAt: now
      },
      {
        prompt: "Factorize x^2 + 9x + 20.",
        answer: "(x + 4)(x + 5)",
        explanation: "Identify the pair whose product is 20 and sum is 9.",
        difficulty: "medium",
        status: "pending"
      }
    ],
    completionRate: 66.67,
    accuracyPercentage: 50,
    completedQuestions: 2,
    lastAttemptedAt: now
  });

  await NotificationModel.insertMany([
    {
      recipientId: student._id,
      type: "ai-guidance",
      title: "Guided doubt support ready",
      message: "Your latest Physics doubt now has a guided explanation waiting.",
      read: false,
      relatedEntityType: "doubt",
      relatedEntityId: firstDoubt._id
    },
    {
      recipientId: student._id,
      type: "practice-generated",
      title: "Practice set available",
      message: "A Mathematics practice set is ready for you.",
      read: false,
      relatedEntityType: "practiceSet"
    },
    {
      recipientId: parent._id,
      type: "student-update",
      title: "Aarav used the AI teacher",
      message: "Aarav completed a guided Physics doubt session today.",
      read: false,
      relatedEntityType: "doubt",
      relatedEntityId: firstDoubt._id
    },
    {
      recipientId: admin._id,
      type: "system",
      title: "Demo institute ready",
      message: "Demo users and sample academic records have been prepared.",
      read: false
    }
  ]);

  const analytics = await recalculateStudentAnalytics(String(student._id));

  return {
    admin,
    teacher,
    student,
    parent,
    analytics
  };
}

try {
  await connectDatabase();
  const seeded = await seedDemoData();

  console.log(
    JSON.stringify(
      {
        mongoUri: getActiveMongoUri(),
        accounts: {
          admin: {
            email: demoAccounts.admin.email,
            password: demoAccounts.admin.password
          },
          teacher: {
            email: demoAccounts.teacher.email,
            password: demoAccounts.teacher.password
          },
          student: {
            email: demoAccounts.student.email,
            password: demoAccounts.student.password
          },
          parent: {
            email: demoAccounts.parent.email,
            password: demoAccounts.parent.password
          }
        },
        linkedStudentId: String(seeded.student._id),
        analytics: {
          attendancePercentage: seeded.analytics.attendancePercentage,
          doubtCount: seeded.analytics.doubtCount,
          practiceAccuracy: seeded.analytics.practiceAccuracy
        }
      },
      null,
      2
    )
  );
} finally {
  await disconnectDatabase();
}
