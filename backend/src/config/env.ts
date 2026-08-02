import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const workspaceDir = path.resolve(backendDir, "..");

function loadLocalEnvFile(): void {
  const loader = (process as typeof process & {
    loadEnvFile?: (path?: string) => void;
  }).loadEnvFile;

  if (typeof loader !== "function") {
    return;
  }

  const candidatePaths = [
    path.resolve(backendDir, ".env"),
    path.resolve(workspaceDir, "backend/.env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "backend/.env")
  ];

  const envPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (envPath) {
    loader(envPath);
  }
}

loadLocalEnvFile();

const rootDir = backendDir;
const rawNodeEnv = process.env.NODE_ENV ?? "development";
const rawPort = Number(process.env.PORT ?? 4000);
const isProduction = rawNodeEnv === "production";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readStorageDriver(value: string | undefined): "local" | "s3" {
  const driver = (value ?? "local").trim().toLowerCase();

  if (driver === "local" || driver === "s3") {
    return driver;
  }

  throw new Error(`Unsupported UPLOAD_STORAGE_DRIVER value "${value}". Use "local" or "s3".`);
}

function readNotificationChannels(value: string | undefined): Array<"in-app" | "email" | "sms"> {
  const channels = parseCsv(value, ["in-app"]);
  const allowed = new Set(["in-app", "email", "sms"]);
  const invalid = channels.filter((channel) => !allowed.has(channel));

  if (invalid.length) {
    throw new Error(`Unsupported NOTIFICATION_CHANNELS values: ${invalid.join(", ")}.`);
  }

  return channels as Array<"in-app" | "email" | "sms">;
}

function normalizeApiKey(value: string | undefined): string {
  return (value ?? "").trim().replace(/^Bearer\s+/i, "");
}

function readAiPrivacyMode(value: string | undefined): "privacy-first" | "standard" {
  const mode = (value ?? "privacy-first").trim().toLowerCase();

  if (mode === "privacy-first" || mode === "standard") {
    return mode;
  }

  throw new Error(`Unsupported AI_PRIVACY_MODE value "${value}". Use "privacy-first" or "standard".`);
}

function readAiProviderPreference(
  value: string | undefined
): "auto" | "deterministic" | "gemini" | "nvidia" {
  const provider = (value ?? "auto").trim().toLowerCase();

  if (provider === "auto" || provider === "deterministic" || provider === "gemini" || provider === "nvidia") {
    return provider;
  }

  throw new Error(
    `Unsupported AI provider value "${value}". Use "auto", "deterministic", "gemini", or "nvidia".`
  );
}

function readTrustProxy(value: string | undefined): boolean | number | string {
  if (!value) {
    return isProduction ? 1 : false;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "false", "1", "0", "yes", "no", "on", "off"].includes(normalized)) {
    return parseBoolean(value, false);
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  return value;
}

function isWeakSecret(secret: string): boolean {
  return !secret || secret === "replace-me" || secret.startsWith("replace-with") || secret.length < 16;
}

function isDefaultSeedPassword(password: string): boolean {
  return !password || password === "Password@123" || password.length < 10;
}

const clientOrigins = parseCsv(process.env.CLIENT_URLS ?? process.env.CLIENT_URL, ["http://localhost:3000"]);
const aiPrivacyMode = readAiPrivacyMode(process.env.AI_PRIVACY_MODE);
const allowCloudByDefault = aiPrivacyMode !== "privacy-first";
const vercelEnvironment = process.env.VERCEL_ENV ?? "";
const uploadStorageDriver = readStorageDriver(process.env.UPLOAD_STORAGE_DRIVER);
const requestedEnableAiImageDoubts = parseBoolean(process.env.ENABLE_AI_IMAGE_DOUBTS, true);
const requestedEnableAiVoiceDoubts = parseBoolean(process.env.ENABLE_AI_VOICE_DOUBTS, true);
const uploadFeaturesAutoDisabledOnVercel =
  isProduction && Boolean(vercelEnvironment) && uploadStorageDriver === "local";
const effectiveEnableAiImageDoubts = uploadFeaturesAutoDisabledOnVercel ? false : requestedEnableAiImageDoubts;
const effectiveEnableAiVoiceDoubts = uploadFeaturesAutoDisabledOnVercel ? false : requestedEnableAiVoiceDoubts;

export const env = {
  nodeEnv: rawNodeEnv,
  port: rawPort,
  trustedProxy: readTrustProxy(process.env.TRUST_PROXY),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/adhyayan",
  mongoServerSelectionTimeoutMs: parseNumber(
    process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
    isProduction ? 15000 : 5000
  ),
  jwtSecret: process.env.JWT_SECRET ?? "replace-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  cookieName: process.env.COOKIE_NAME ?? "adhyayan_token",
  cookieDomain: process.env.COOKIE_DOMAIN ?? undefined,
  clientOrigins,
  clientUrl: clientOrigins[0] ?? "http://localhost:3000",
  serverPublicUrl: process.env.SERVER_PUBLIC_URL ?? `http://localhost:${rawPort}`,
  publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL ?? `${process.env.SERVER_PUBLIC_URL ?? `http://localhost:${rawPort}`}/api`,
  vercelEnvironment,
  loginAttemptLimit: parseNumber(process.env.LOGIN_ATTEMPT_LIMIT, 5),
  loginLockMinutes: parseNumber(process.env.LOGIN_LOCK_MINUTES, 15),
  inviteTokenTtlMinutes: parseNumber(process.env.INVITE_TOKEN_TTL_MINUTES, 60 * 24 * 3),
  passwordResetTokenTtlMinutes: parseNumber(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 60),
  aiPrivacyMode,
  aiReasoningProvider: readAiProviderPreference(process.env.AI_REASONING_PROVIDER),
  aiMultimodalProvider: readAiProviderPreference(process.env.AI_MULTIMODAL_PROVIDER),
  aiTranscriptionProvider: readAiProviderPreference(process.env.AI_TRANSCRIPTION_PROVIDER),
  allowGeminiCloudAi: rawNodeEnv === "test" ? false : parseBoolean(process.env.ALLOW_GEMINI_CLOUD_AI, allowCloudByDefault),
  allowNvidiaCloudAi: rawNodeEnv === "test" ? false : parseBoolean(process.env.ALLOW_NVIDIA_CLOUD_AI, allowCloudByDefault),
  aiHttpTimeoutMs: parseNumber(process.env.AI_HTTP_TIMEOUT_MS, 15000),
  aiMaxRetries: parseNumber(process.env.AI_MAX_RETRIES, 1),
  aiCircuitBreakerThreshold: parseNumber(process.env.AI_CIRCUIT_BREAKER_THRESHOLD, 4),
  aiCircuitBreakerResetMs: parseNumber(process.env.AI_CIRCUIT_BREAKER_RESET_MS, 60000),
  geminiApiKey: normalizeApiKey(process.env.GEMINI_API_KEY),
  geminiReasoningModel: process.env.GEMINI_REASONING_MODEL ?? "gemini-2.0-flash",
  geminiMultimodalModel: process.env.GEMINI_MULTIMODAL_MODEL ?? "gemini-2.0-flash",
  nvidiaApiKey: normalizeApiKey(process.env.NVIDIA_API_KEY),
  nvidiaReasoningModel: process.env.NVIDIA_REASONING_MODEL ?? "microsoft/phi-4-mini-instruct",
  nvidiaMultimodalModel:
    process.env.NVIDIA_MULTIMODAL_MODEL ?? "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4",
  requestedEnableAiImageDoubts,
  requestedEnableAiVoiceDoubts,
  enableAiImageDoubts: effectiveEnableAiImageDoubts,
  enableAiVoiceDoubts: effectiveEnableAiVoiceDoubts,
  uploadFeaturesAutoDisabledOnVercel,
  uploadStorageDriver,
  uploadDir: Boolean(vercelEnvironment || process.env.VERCEL) ? "/tmp/uploads" : path.resolve(rootDir, process.env.UPLOAD_DIR ?? "uploads"),
  enableUploadMalwareScanHook: parseBoolean(process.env.ENABLE_UPLOAD_MALWARE_SCAN_HOOK, false),
  uploadMalwareScanEndpoint: process.env.UPLOAD_MALWARE_SCAN_ENDPOINT ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3Region: process.env.S3_REGION ?? "auto",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",
  s3ForcePathStyle: parseBoolean(process.env.S3_FORCE_PATH_STYLE, Boolean(process.env.S3_ENDPOINT)),
  notificationChannels: readNotificationChannels(process.env.NOTIFICATION_CHANNELS),
  enableSeedAdminBootstrap: parseBoolean(process.env.SEED_ADMIN_BOOTSTRAP, !isProduction),
  seedAdminName: process.env.SEED_ADMIN_NAME ?? "Institute Admin",
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@adhyayan.local",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "Password@123",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
};

const envErrors: string[] = [];
const envWarnings: string[] = [];

if (isProduction && isWeakSecret(env.jwtSecret)) {
  envErrors.push("JWT_SECRET must be set to a long non-placeholder value in production.");
} else if (!isProduction && isWeakSecret(env.jwtSecret)) {
  envWarnings.push("JWT_SECRET is using a weak development fallback.");
}

if (!env.clientOrigins.length) {
  envErrors.push("At least one CLIENT_URL or CLIENT_URLS origin must be configured.");
}

if (env.uploadStorageDriver === "s3") {
  const missingS3Fields = [
    ["S3_BUCKET", env.s3Bucket],
    ["S3_ACCESS_KEY_ID", env.s3AccessKeyId],
    ["S3_SECRET_ACCESS_KEY", env.s3SecretAccessKey]
  ].filter(([, value]) => !value);

  if (missingS3Fields.length) {
    envErrors.push(
      `S3 upload mode is enabled but these vars are missing: ${missingS3Fields.map(([key]) => key).join(", ")}.`
    );
  }
}

if (env.uploadFeaturesAutoDisabledOnVercel && (env.requestedEnableAiImageDoubts || env.requestedEnableAiVoiceDoubts)) {
  envWarnings.push(
    "Image and voice doubt uploads were automatically disabled because this Vercel production deployment is using local storage. Configure S3-compatible storage to re-enable them."
  );
}

if (isProduction && env.notificationChannels.some((channel) => channel !== "in-app")) {
  envErrors.push("Production notification channels are limited to in-app until email/SMS delivery is implemented.");
}

if (env.aiPrivacyMode === "privacy-first" && env.geminiApiKey && !env.allowGeminiCloudAi) {
  envWarnings.push("Gemini API key is configured, but privacy mode is blocking Gemini until ALLOW_GEMINI_CLOUD_AI=true.");
}

if (env.aiPrivacyMode === "privacy-first" && env.nvidiaApiKey && !env.allowNvidiaCloudAi) {
  envWarnings.push("NVIDIA API key is configured, but privacy mode is blocking NVIDIA until ALLOW_NVIDIA_CLOUD_AI=true.");
}

if (env.enableSeedAdminBootstrap && isDefaultSeedPassword(env.seedAdminPassword)) {
  if (isProduction) {
    envErrors.push("SEED_ADMIN_PASSWORD must be changed before enabling seed admin bootstrap in production.");
  } else {
    envWarnings.push("Seed admin bootstrap is using the default development password.");
  }
}

if (envErrors.length) {
  throw new Error(`Environment validation failed:\n- ${envErrors.join("\n- ")}`);
}

if (envWarnings.length && env.nodeEnv !== "test") {
  envWarnings.forEach((warning) => console.warn(`[env] ${warning}`));
}

export { isProduction };
