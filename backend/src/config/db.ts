import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { env } from "./env.js";
import { logger } from "../services/ops/logger.js";

let embeddedMongo: MongoMemoryServer | null = null;
let activeMongoUri = env.mongoUri;
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function connectWithUri(mongoUri: string): Promise<void> {
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs
  });
  activeMongoUri = mongoUri;
}

async function startEmbeddedMongo(): Promise<string> {
  if (embeddedMongo) {
    return embeddedMongo.getUri();
  }

  const dbRoot = path.resolve(backendDir, ".adhyayan-mongo");
  const dbPath = path.join(dbRoot, "data");

  embeddedMongo = await MongoMemoryServer.create({
    instance: {
      dbName: "adhyayan",
      dbPath,
      launchTimeout: 30000
    }
  });

  logger.warn("Primary MongoDB is unavailable. Falling back to embedded development MongoDB.", {
    requestedMongoUri: env.mongoUri,
    embeddedDbPath: dbPath
  });

  return embeddedMongo.getUri();
}

export async function connectDatabase(): Promise<void> {
  try {
    await connectWithUri(env.mongoUri);
    logger.info("MongoDB connected.", { mongoUri: env.mongoUri, driver: "external" });
  } catch (error) {
    if (env.nodeEnv === "production") {
      throw error;
    }

    const embeddedMongoUri = await startEmbeddedMongo();
    await connectWithUri(embeddedMongoUri);
    logger.info("MongoDB connected.", { mongoUri: embeddedMongoUri, driver: "embedded" });
  }
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getActiveMongoUri(): string {
  return activeMongoUri;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  if (embeddedMongo) {
    await embeddedMongo.stop();
    embeddedMongo = null;
  }
  logger.info("MongoDB disconnected.");
}
