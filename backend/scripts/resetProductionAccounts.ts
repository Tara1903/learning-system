import { rm } from "node:fs/promises";

import bcrypt from "bcryptjs";

import { env } from "../src/config/env.js";
import { connectDatabase, disconnectDatabase, getActiveMongoUri } from "../src/config/db.js";
import { AnalyticsModel } from "../src/models/Analytics.js";
import { AttendanceModel } from "../src/models/Attendance.js";
import { AuditLogModel } from "../src/models/AuditLog.js";
import { AuthTokenModel } from "../src/models/AuthToken.js";
import { DoubtModel } from "../src/models/Doubt.js";
import { NotificationModel } from "../src/models/Notification.js";
import { PracticeSetModel } from "../src/models/PracticeSet.js";
import { UploadAssetModel } from "../src/models/UploadAsset.js";
import { UserModel } from "../src/models/User.js";

const realAccounts = {
  admin: {
    name: "Institute Admin",
    email: "admin@adhyayan.local",
    password: "Admin@Adhyayan2026!",
    role: "admin" as const
  },
  teacher: {
    name: "Class Teacher",
    email: "teacher@adhyayan.local",
    password: "Teacher@Adhyayan2026!",
    role: "teacher" as const,
    profile: {
      phone: "9999000100",
      section: "Academic"
    }
  },
  student: {
    name: "Student Account",
    email: "student@adhyayan.local",
    password: "Student@Adhyayan2026!",
    role: "student" as const,
    class: "10",
    profile: {
      section: "A",
      admissionNumber: "ADH-REAL-001",
      guardianName: "Parent Account"
    }
  },
  parent: {
    name: "Parent Account",
    email: "parent@adhyayan.local",
    password: "Parent@Adhyayan2026!",
    role: "parent" as const,
    profile: {
      phone: "9999000101",
      guardianName: "Student Account"
    }
  }
};

async function removeUploadFilesForUsers(userIds: string[]): Promise<void> {
  const assets = await UploadAssetModel.find({ ownerId: { $in: userIds } });

  await Promise.all(
    assets.map(async (asset) => {
      if (asset.absolutePath) {
        await rm(asset.absolutePath, { force: true }).catch(() => undefined);
      }
    })
  );
}

async function removeAllUploadFiles(): Promise<void> {
  const assets = await UploadAssetModel.find({});

  await Promise.all(
    assets.map(async (asset) => {
      if (asset.absolutePath) {
        await rm(asset.absolutePath, { force: true }).catch(() => undefined);
      }
    })
  );
}

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
      tokenVersion: 1,
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      lastLoginAt: undefined
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

async function resetStarterData(): Promise<void> {
  const existingUsers = await UserModel.find({}).select("_id");
  const existingUserIds = existingUsers.map((user) => String(user._id));

  if (existingUserIds.length) {
    await removeUploadFilesForUsers(existingUserIds);
  } else {
    await removeAllUploadFiles();
  }

  await Promise.all([
    AuthTokenModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    AnalyticsModel.deleteMany({}),
    AttendanceModel.deleteMany({}),
    DoubtModel.deleteMany({}),
    PracticeSetModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    UploadAssetModel.deleteMany({}),
    UserModel.deleteMany({})
  ]);
}

function buildSecretPreview(secret: string): string {
  return `${secret.slice(0, 6)}...${secret.slice(-6)}`;
}

try {
  await connectDatabase();
  await resetStarterData();

  const admin = await upsertUser(realAccounts.admin);
  const teacher = await upsertUser(realAccounts.teacher);
  const student = await upsertUser(realAccounts.student);
  const parent = await upsertUser({
    ...realAccounts.parent,
    linkedStudentId: String(student._id),
    linkedStudentIds: [String(student._id)]
  });

  console.log(
    JSON.stringify(
      {
        mongoUri: getActiveMongoUri(),
        credentials: {
          admin: {
            email: realAccounts.admin.email,
            password: realAccounts.admin.password
          },
          teacher: {
            email: realAccounts.teacher.email,
            password: realAccounts.teacher.password
          },
          student: {
            email: realAccounts.student.email,
            password: realAccounts.student.password
          },
          parent: {
            email: realAccounts.parent.email,
            password: realAccounts.parent.password
          }
        },
        linkedStudentId: String(student._id),
        bootstrapDisabledRecommended: true,
        currentSeedBootstrap: env.enableSeedAdminBootstrap,
        jwtSecretPreview: buildSecretPreview(env.jwtSecret),
        createdUserIds: {
          admin: String(admin._id),
          teacher: String(teacher._id),
          student: String(student._id),
          parent: String(parent._id)
        }
      },
      null,
      2
    )
  );
} finally {
  await disconnectDatabase();
}
