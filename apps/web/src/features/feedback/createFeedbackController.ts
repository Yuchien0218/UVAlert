import { shallowReadonly, shallowRef, type ShallowRef } from "vue";
import {
  FeedbackRequestV1Schema,
  type FeedbackReceiptV1,
  type FeedbackType
} from "@sunshield/contracts";
import type { CloudError, FeedbackPort } from "@sunshield/platform";

export type FeedbackControllerStatus =
  "idle" | "submitting" | "submitted" | "error";
export type FeedbackControllerState = {
  status: FeedbackControllerStatus;
  receipt: FeedbackReceiptV1 | null;
  error: CloudError | null;
};

export interface FeedbackController {
  readonly state: Readonly<ShallowRef<FeedbackControllerState>>;
  submit(input: {
    feedbackType: FeedbackType;
    message: string;
    contactEmail?: string | null;
  }): Promise<boolean>;
  reset(): void;
  dispose(): void;
}

export function createFeedbackController(options: {
  feedback: FeedbackPort;
  getRoute?: () => string;
  appVersion?: string;
  getUserAgentSummary?: () => string | null;
}): FeedbackController {
  const state = shallowRef<FeedbackControllerState>({
    status: "idle",
    receipt: null,
    error: null
  });
  let disposed = false;
  let submitting = false;
  const getRoute =
    options.getRoute ??
    (() =>
      typeof globalThis.location === "undefined"
        ? "/"
        : globalThis.location.pathname);
  const getUserAgentSummary =
    options.getUserAgentSummary ??
    (() =>
      typeof globalThis.navigator === "undefined"
        ? null
        : globalThis.navigator.userAgent.slice(0, 256));

  async function submit(input: {
    feedbackType: FeedbackType;
    message: string;
    contactEmail?: string | null;
  }): Promise<boolean> {
    if (disposed || submitting) return false;
    submitting = true;
    state.value = { status: "submitting", receipt: null, error: null };
    try {
      const request = FeedbackRequestV1Schema.parse({
        schemaVersion: "feedback-v1",
        feedbackType: input.feedbackType,
        message: input.message,
        contactEmail: input.contactEmail ?? null,
        appVersion: options.appVersion ?? "web-dev",
        route: getRoute(),
        userAgentSummary: getUserAgentSummary()
      });
      const receipt = await options.feedback.submit(request);
      state.value = { status: "submitted", receipt, error: null };
      return true;
    } catch (error) {
      state.value = {
        status: "error",
        receipt: null,
        error: toCloudError(error)
      };
      return false;
    } finally {
      submitting = false;
    }
  }

  return {
    state: shallowReadonly(state),
    submit,
    reset(): void {
      if (!disposed)
        state.value = { status: "idle", receipt: null, error: null };
    },
    dispose(): void {
      disposed = true;
    }
  };
}

function toCloudError(error: unknown): CloudError {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error as CloudError;
  }
  return {
    status: 500,
    code: "SERVER_ERROR",
    message: "回報尚未送出，請稍後再試",
    cause: error
  };
}
