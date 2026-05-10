import { maybeTranscribeAudio } from "./aiClient.js";

export async function transcribeStudentVoiceNote(input: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<string> {
  try {
    const transcript = await maybeTranscribeAudio({
      bytes: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName
    });

    if (transcript?.text) {
      return transcript.text;
    }
  } catch {
    // Fall through to the non-blocking fallback transcript.
  }

  return "Voice note received. Cloud transcription is unavailable right now, so please add a short text summary if needed.";
}
