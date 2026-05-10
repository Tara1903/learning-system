import type { ApiEnvelope } from "./types";
import { SESSION_EXPIRED_EVENT } from "./auth-events";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface ErrorEnvelope {
  success: false;
  message?: string;
  errorId?: string;
  code?: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  errorId?: string;

  constructor(message: string, status: number, options?: { code?: string; details?: unknown; errorId?: string }) {
    super(message);
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
    this.errorId = options?.errorId;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? ((await response.json()) as ApiEnvelope<T> | ErrorEnvelope) : null;

  if (!response.ok || !payload?.success) {
    const message =
      payload && "message" in payload && payload.message
        ? payload.message
        : response.statusText || "Request failed.";

    throw new ApiClientError(message, response.status, {
      code: payload && "code" in payload ? payload.code : undefined,
      details: payload && "details" in payload ? payload.details : undefined,
      errorId: payload && "errorId" in payload ? payload.errorId : undefined
    });
  }

  return payload.data;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {})
    }
  });

  try {
    return await parseResponse<T>(response);
  } catch (error) {
    if (
      typeof window !== "undefined" &&
      error instanceof ApiClientError &&
      error.status === 401 &&
      !["/login", "/auth/login", "/auth/setup-password", "/auth/forgot-password", "/auth/reset-password"].includes(path)
    ) {
      window.dispatchEvent(
        new CustomEvent(SESSION_EXPIRED_EVENT, {
          detail: {
            message: error.message,
            code: error.code
          }
        })
      );
    }

    throw error;
  }
}

export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<T>(path, {
    method: "POST",
    body: formData
  });
}
