import { create } from "zustand";

type DoubtMode = "hint" | "step-by-step" | "simplify" | "reveal-answer";

interface ChatStore {
  activeThreadId: string | null;
  mode: DoubtMode;
  attachmentAssetId: string | null;
  attachmentDownloadUrl: string | null;
  setThreadId: (threadId: string | null) => void;
  setMode: (mode: DoubtMode) => void;
  setAttachmentAsset: (assetId: string | null, downloadUrl?: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeThreadId: null,
  mode: "hint",
  attachmentAssetId: null,
  attachmentDownloadUrl: null,
  setThreadId: (activeThreadId) => set({ activeThreadId }),
  setMode: (mode) => set({ mode }),
  setAttachmentAsset: (attachmentAssetId, attachmentDownloadUrl = null) => set({ attachmentAssetId, attachmentDownloadUrl })
}));
