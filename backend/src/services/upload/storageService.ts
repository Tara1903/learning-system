import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "../../config/env.js";


const imageDir = path.join(env.uploadDir, "images");
const audioDir = path.join(env.uploadDir, "audio");

export interface SavedUpload {
  fileName: string;
  storageDriver: "local" | "s3";
  storageKey: string;
  absolutePath?: string;
  mimeType: string;
  originalFileName: string;
  byteSize: number;
}

interface StoredFileContent {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
}

interface UploadStorageProvider {
  driver: "local" | "s3";
  ensureReady: () => Promise<void>;
  saveUploadedFile: (file: Express.Multer.File, category: "images" | "audio") => Promise<SavedUpload>;
  readStoredFile: (asset: any) => Promise<StoredFileContent>;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.-]/g, "-").toLowerCase();
}

const localProvider: UploadStorageProvider = {
  driver: "local",
  ensureReady: async () => {
    await mkdir(imageDir, { recursive: true });
    await mkdir(audioDir, { recursive: true });
  },
  saveUploadedFile: async (file, category) => {
    const destinationDir = category === "images" ? imageDir : audioDir;
    const extension = path.extname(file.originalname) || (category === "images" ? ".png" : ".webm");
    const fileName = `${Date.now()}-${sanitizeFileName(path.basename(file.originalname, extension))}${extension}`;
    const absolutePath = path.join(destinationDir, fileName);
    const storageKey = `uploads/${category}/${fileName}`;

    await writeFile(absolutePath, file.buffer);

    return {
      fileName,
      absolutePath,
      storageKey,
      mimeType: file.mimetype,
      originalFileName: file.originalname || fileName,
      byteSize: file.size,
      storageDriver: "local"
    };
  },
  readStoredFile: async (asset) => {
    if (!asset.absolutePath) {
      throw new Error("Local upload is missing its absolute path.");
    }

    return {
      bytes: await readFile(asset.absolutePath),
      mimeType: asset.mimeType,
      fileName: asset.originalFileName || asset.fileName
    };
  }
};

const s3Client =
  env.uploadStorageDriver === "s3"
    ? new S3Client({
        region: env.s3Region,
        endpoint: env.s3Endpoint || undefined,
        forcePathStyle: env.s3ForcePathStyle,
        credentials: {
          accessKeyId: env.s3AccessKeyId,
          secretAccessKey: env.s3SecretAccessKey
        }
      })
    : null;

const s3Provider: UploadStorageProvider = {
  driver: "s3",
  ensureReady: async () => Promise.resolve(),
  saveUploadedFile: async (file, category) => {
    if (!s3Client) {
      throw new Error("S3 upload provider is not initialized.");
    }

    const extension = path.extname(file.originalname) || (category === "images" ? ".png" : ".webm");
    const fileName = `${Date.now()}-${sanitizeFileName(path.basename(file.originalname, extension))}${extension}`;
    const storageKey = `uploads/${category}/${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: storageKey,
        Body: file.buffer,
        ContentType: file.mimetype
      })
    );

    return {
      fileName,
      storageKey,
      mimeType: file.mimetype,
      originalFileName: file.originalname || fileName,
      byteSize: file.size,
      storageDriver: "s3"
    };
  },
  readStoredFile: async (asset) => {
    if (!s3Client) {
      throw new Error("S3 upload provider is not initialized.");
    }

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: env.s3Bucket,
        Key: asset.storageKey
      })
    );

    if (!response.Body || typeof response.Body.transformToByteArray !== "function") {
      throw new Error("Unable to read the stored S3 upload.");
    }

    return {
      bytes: Buffer.from(await response.Body.transformToByteArray()),
      mimeType: asset.mimeType,
      fileName: asset.originalFileName || asset.fileName
    };
  }
};

function getStorageProvider(): UploadStorageProvider {
  return env.uploadStorageDriver === "s3" ? s3Provider : localProvider;
}

export async function ensureUploadDirectories(): Promise<void> {
  await getStorageProvider().ensureReady();
}

export async function saveUploadedFile(file: Express.Multer.File, category: "images" | "audio"): Promise<SavedUpload> {
  const provider = getStorageProvider();
  const extension = path.extname(file.originalname) || (category === "images" ? ".png" : ".webm");

  if (!extension) {
    throw new Error("Unable to determine upload file extension.");
  }

  return provider.saveUploadedFile(file, category);
}

export async function readUploadedAsset(asset: any): Promise<StoredFileContent> {
  return getStorageProvider().readStoredFile(asset);
}
