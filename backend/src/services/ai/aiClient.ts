import { env } from "../../config/env.js";
import { ApiError } from "../../utils/http.js";
import { logger } from "../ops/logger.js";

export type AiCapability = "reasoning" | "multimodal" | "transcription";
export type AiCloudProvider = "gemini" | "nvidia";
export type AiProviderName = AiCloudProvider | "deterministic";

type AiProviderPreference = "auto" | AiProviderName;

interface ResponseRequest {
  systemPrompt: string;
  userPrompt: string;
  capability: Exclude<AiCapability, "transcription">;
  feature: string;
  attachment?: AiAttachment;
  expectJson?: boolean;
}

export interface AiAttachment {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
}

export interface StructuredTextResult {
  provider: AiProviderName;
  text: string;
}

export interface AudioTranscriptionResult {
  provider: AiProviderName;
  text: string;
}

interface ProviderState {
  failureCount: number;
  openedAt: number | null;
}

interface GeminiUploadedFile {
  name: string;
  uri: string;
  mimeType: string;
}

interface ProviderStatus {
  configured: boolean;
  allowed: boolean;
  circuitOpen: boolean;
}

const circuitBreakerState: Record<AiCloudProvider, ProviderState> = {
  gemini: {
    failureCount: 0,
    openedAt: null
  },
  nvidia: {
    failureCount: 0,
    openedAt: null
  }
};

function toDataUrl(bytes: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function isCircuitOpen(provider: AiCloudProvider): boolean {
  const state = circuitBreakerState[provider];

  if (!state.openedAt) {
    return false;
  }

  if (Date.now() - state.openedAt >= env.aiCircuitBreakerResetMs) {
    state.openedAt = null;
    state.failureCount = 0;
    return false;
  }

  return true;
}

function recordSuccess(provider: AiCloudProvider): void {
  circuitBreakerState[provider].failureCount = 0;
  circuitBreakerState[provider].openedAt = null;
}

function recordFailure(provider: AiCloudProvider, error: unknown, context: Record<string, unknown>): void {
  const state = circuitBreakerState[provider];
  state.failureCount += 1;

  if (state.failureCount >= env.aiCircuitBreakerThreshold) {
    state.openedAt = Date.now();
  }

  logger.warn("AI provider request failed.", {
    provider,
    ...context,
    failureCount: state.failureCount,
    circuitOpen: Boolean(state.openedAt),
    error: logger.serializeError(error)
  });
}

function isGeminiConfigured(): boolean {
  return Boolean(env.geminiApiKey);
}

function isNvidiaConfigured(): boolean {
  return Boolean(env.nvidiaApiKey);
}

function isCloudProviderAllowed(provider: AiCloudProvider): boolean {
  if (provider === "gemini") {
    return env.allowGeminiCloudAi;
  }

  return env.allowNvidiaCloudAi;
}

function getProviderPreference(capability: AiCapability): AiProviderPreference {
  if (capability === "reasoning") {
    return env.aiReasoningProvider;
  }

  if (capability === "multimodal") {
    return env.aiMultimodalProvider;
  }

  return env.aiTranscriptionProvider;
}

function getProviderStatus(provider: AiCloudProvider): ProviderStatus {
  return {
    configured: provider === "gemini" ? isGeminiConfigured() : isNvidiaConfigured(),
    allowed: isCloudProviderAllowed(provider),
    circuitOpen: isCircuitOpen(provider)
  };
}

export function hasAnyCloudAiConfigured(): boolean {
  return (isGeminiConfigured() && isCloudProviderAllowed("gemini")) || (isNvidiaConfigured() && isCloudProviderAllowed("nvidia"));
}

export function describeAiRuntime(): Record<string, unknown> {
  const gemini = getProviderStatus("gemini");
  const nvidia = getProviderStatus("nvidia");

  return {
    privacyMode: env.aiPrivacyMode,
    preferences: {
      reasoning: env.aiReasoningProvider,
      multimodal: env.aiMultimodalProvider,
      transcription: env.aiTranscriptionProvider
    },
    providers: {
      gemini,
      nvidia
    },
    fallbackReady: true
  };
}

export function buildProviderOrder(
  preference: AiProviderPreference,
  capability: AiCapability,
  status: Record<AiCloudProvider, ProviderStatus>
): AiProviderName[] {
  const allowedProviders = (["gemini", "nvidia"] as AiCloudProvider[]).filter((provider) => {
    const providerStatus = status[provider];
    return providerStatus.configured && providerStatus.allowed && !providerStatus.circuitOpen;
  });

  if (preference === "deterministic") {
    return ["deterministic"];
  }

  if (preference === "gemini") {
    return allowedProviders.includes("gemini") ? ["gemini", "deterministic"] : ["deterministic"];
  }

  if (preference === "nvidia") {
    return allowedProviders.includes("nvidia") ? ["nvidia", "deterministic"] : ["deterministic"];
  }

  const autoOrder: Record<AiCapability, AiCloudProvider[]> = {
    reasoning: ["gemini", "nvidia"],
    multimodal: ["gemini", "nvidia"],
    transcription: ["gemini", "nvidia"]
  };

  return [...autoOrder[capability].filter((provider) => allowedProviders.includes(provider)), "deterministic"];
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.aiHttpTimeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestCloudProvider(
  provider: AiCloudProvider,
  url: string,
  init: RequestInit,
  context: Record<string, unknown>
): Promise<Response> {
  if (isCircuitOpen(provider)) {
    throw new ApiError(503, `${provider} AI provider is temporarily unavailable. Please try again shortly.`);
  }

  let lastError: unknown;
  const attempts = Math.max(1, env.aiMaxRetries + 1);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init);

      if (!response.ok) {
        const errorText = await response.text();
        const error = new ApiError(502, `${provider} AI provider request failed.`, errorText);

        recordFailure(provider, error, {
          ...context,
          attempt,
          status: response.status
        });

        if (response.status >= 500 && attempt < attempts) {
          lastError = error;
          continue;
        }

        throw error;
      }

      recordSuccess(provider);
      return response;
    } catch (error) {
      lastError = error;
      recordFailure(provider, error, {
        ...context,
        attempt,
        aborted: error instanceof Error && error.name === "AbortError"
      });

      if (attempt >= attempts) {
        break;
      }
    }
  }

  throw lastError instanceof ApiError
    ? lastError
    : new ApiError(502, `${provider} AI provider request failed.`, logger.serializeError(lastError));
}

function extractGeminiText(payload: any): string {
  return payload?.candidates
    ?.flatMap((candidate: any) => candidate?.content?.parts ?? [])
    ?.map((part: any) => part?.text ?? "")
    ?.join("\n")
    ?.trim() ?? "";
}

function extractNvidiaText(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}

export function extractStructuredJsonText(rawText: string): string {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return trimmed;
  }

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  const starts = [firstBrace, firstBracket].filter((value) => value >= 0).sort((left, right) => left - right);

  if (!starts.length) {
    return trimmed;
  }

  const startIndex = starts[0]!;
  const opening = trimmed[startIndex]!;
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < trimmed.length; index += 1) {
    const char = trimmed[index]!;

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === opening) {
      depth += 1;
      continue;
    }

    if (char === closing) {
      depth -= 1;

      if (depth === 0) {
        return trimmed.slice(startIndex, index + 1);
      }
    }
  }

  return trimmed;
}

export function parseStructuredJson<T>(rawText: string): T {
  return JSON.parse(extractStructuredJsonText(rawText)) as T;
}

async function uploadGeminiFile(file: AiAttachment): Promise<GeminiUploadedFile> {
  const startResponse = await requestCloudProvider(
    "gemini",
    "https://generativelanguage.googleapis.com/upload/v1beta/files",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.geminiApiKey,
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(file.bytes.length),
        "X-Goog-Upload-Header-Content-Type": file.mimeType
      },
      body: JSON.stringify({
        file: {
          display_name: file.fileName
        }
      })
    },
    {
      operation: "gemini.files.start"
    }
  );

  const uploadUrl = startResponse.headers.get("x-goog-upload-url");

  if (!uploadUrl) {
    throw new ApiError(502, "Gemini file upload could not be started.");
  }

  const finalizeResponse = await requestCloudProvider(
    "gemini",
    uploadUrl,
    {
      method: "POST",
      headers: {
        "Content-Length": String(file.bytes.length),
        "Content-Type": file.mimeType,
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize"
      },
      body: new Uint8Array(file.bytes)
    },
    {
      operation: "gemini.files.finalize"
    }
  );

  const payload = (await finalizeResponse.json()) as {
    file?: {
      name?: string;
      uri?: string;
      mimeType?: string;
    };
  };

  if (!payload.file?.name || !payload.file.uri) {
    throw new ApiError(502, "Gemini file upload did not return a usable file reference.");
  }

  return {
    name: payload.file.name,
    uri: payload.file.uri,
    mimeType: payload.file.mimeType ?? file.mimeType
  };
}

async function deleteGeminiFile(fileName: string): Promise<void> {
  await requestCloudProvider(
    "gemini",
    `https://generativelanguage.googleapis.com/v1beta/${fileName}`,
    {
      method: "DELETE",
      headers: {
        "x-goog-api-key": env.geminiApiKey
      }
    },
    {
      operation: "gemini.files.delete",
      fileName
    }
  );
}

async function requestGeminiStructuredText(request: ResponseRequest): Promise<string> {
  const model = request.capability === "multimodal" ? env.geminiMultimodalModel : env.geminiReasoningModel;
  let uploadedFile: GeminiUploadedFile | null = null;

  try {
    const parts: Array<Record<string, unknown>> = [
      {
        text: request.userPrompt
      }
    ];

    if (request.attachment) {
      uploadedFile = await uploadGeminiFile(request.attachment);
      parts.push({
        file_data: {
          mime_type: uploadedFile.mimeType,
          file_uri: uploadedFile.uri
        }
      });
    }

    const response = await requestCloudProvider(
      "gemini",
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.geminiApiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: request.systemPrompt
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts
            }
          ],
          generationConfig: request.expectJson
            ? {
                responseMimeType: "application/json",
                temperature: 0.2
              }
            : {
                temperature: 0.2
              }
        })
      },
      {
        operation: "gemini.generateContent",
        feature: request.feature,
        capability: request.capability,
        model
      }
    );

    const payload = await response.json();
    const text = extractGeminiText(payload);

    if (!text) {
      throw new ApiError(502, "Gemini returned an empty response.");
    }

    return text;
  } finally {
    if (uploadedFile) {
      await deleteGeminiFile(uploadedFile.name).catch((error) => {
        logger.warn("Gemini temporary file cleanup failed.", {
          fileName: uploadedFile?.name,
          error: logger.serializeError(error)
        });
      });
    }
  }
}

function buildNvidiaUserContent(request: ResponseRequest): string | Array<Record<string, unknown>> {
  if (!request.attachment) {
    return request.userPrompt;
  }

  const mediaType = request.attachment.mimeType.startsWith("image/") ? "image_url" : "audio_url";
  const mediaPayloadKey = mediaType === "image_url" ? "image_url" : "audio_url";

  return [
    {
      type: "text",
      text: request.userPrompt
    },
    {
      type: mediaType,
      [mediaPayloadKey]: {
        url: toDataUrl(request.attachment.bytes, request.attachment.mimeType)
      }
    }
  ];
}

async function requestNvidiaStructuredText(request: ResponseRequest): Promise<string> {
  const model =
    request.capability === "multimodal" ? env.nvidiaMultimodalModel : env.nvidiaReasoningModel;

  const response = await requestCloudProvider(
    "nvidia",
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.nvidiaApiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1600,
        top_p: 0.9,
        chat_template_kwargs: {
          enable_thinking: false
        },
        messages: [
          {
            role: "system",
            content: request.systemPrompt
          },
          {
            role: "user",
            content: buildNvidiaUserContent(request)
          }
        ]
      })
    },
    {
      operation: "nvidia.chat.completions",
      feature: request.feature,
      capability: request.capability,
      model
    }
  );

  const payload = await response.json();
  const text = extractNvidiaText(payload);

  if (!text) {
    throw new ApiError(502, "NVIDIA returned an empty response.");
  }

  return text;
}

async function requestGeminiTranscription(input: AiAttachment): Promise<string> {
  const response = await requestGeminiStructuredText({
    systemPrompt:
      "You are transcribing a student voice note. Return only the transcript text. Preserve the original language and keep mathematics or science terms as spoken.",
    userPrompt: "Transcribe this student voice note accurately. Return only the transcript text with no labels.",
    capability: "multimodal",
    feature: "voice-transcription",
    attachment: input,
    expectJson: false
  });

  return response.trim();
}

async function requestNvidiaTranscription(input: AiAttachment): Promise<string> {
  const response = await requestNvidiaStructuredText({
    systemPrompt:
      "You transcribe school student voice notes. Return only the transcript text. Do not add commentary, metadata, or formatting.",
    userPrompt: "Transcribe this student voice note. Return only the transcript text.",
    capability: "multimodal",
    feature: "voice-transcription",
    attachment: input,
    expectJson: false
  });

  return response.trim();
}

export async function maybeGenerateStructuredText(
  request: ResponseRequest
): Promise<StructuredTextResult | null> {
  const statuses = {
    gemini: getProviderStatus("gemini"),
    nvidia: getProviderStatus("nvidia")
  };
  const order = buildProviderOrder(getProviderPreference(request.capability), request.capability, statuses);

  for (const provider of order) {
    if (provider === "deterministic") {
      logger.info("AI feature is using deterministic fallback.", {
        feature: request.feature,
        capability: request.capability
      });
      return null;
    }

    try {
      const text =
        provider === "gemini"
          ? await requestGeminiStructuredText(request)
          : await requestNvidiaStructuredText(request);

      return {
        provider,
        text
      };
    } catch (error) {
      logger.warn("Falling back after AI provider failure.", {
        provider,
        feature: request.feature,
        capability: request.capability,
        error: logger.serializeError(error)
      });
    }
  }

  return null;
}

export async function maybeTranscribeAudio(input: AiAttachment): Promise<AudioTranscriptionResult | null> {
  const statuses = {
    gemini: getProviderStatus("gemini"),
    nvidia: getProviderStatus("nvidia")
  };
  const order = buildProviderOrder(getProviderPreference("transcription"), "transcription", statuses);

  for (const provider of order) {
    if (provider === "deterministic") {
      logger.info("Voice transcription is using deterministic fallback.");
      return null;
    }

    try {
      const text =
        provider === "gemini" ? await requestGeminiTranscription(input) : await requestNvidiaTranscription(input);

      if (text) {
        return {
          provider,
          text
        };
      }
    } catch (error) {
      logger.warn("Falling back after transcription provider failure.", {
        provider,
        error: logger.serializeError(error)
      });
    }
  }

  return null;
}
