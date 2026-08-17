import type {
  FeedbackReceiptV1,
  FeedbackRequestV1,
  SyncCommitRequestV1,
  SyncCommitResultV1,
  SyncConflictV1,
  SyncDeleteRequestV1,
  SyncDeleteResultV1,
  SyncManifestV1,
  SyncReadRequestV1,
  SyncRecordEnvelopeV1,
  SyncReadResponseV1
} from "@sunshield/contracts";

export type AuthState =
  | { kind: "signed_out" }
  | {
      kind: "signed_in";
      userId: string;
      accessTokenExpiresAt: string | null;
    };

export type CloudErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "SYNC_CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "SERVER_ERROR";

export type CloudError = {
  code: CloudErrorCode;
  message: string;
  status: number;
  conflicts?: SyncConflictV1[];
  cause?: unknown;
};

export interface AuthPort {
  getState(): Promise<AuthState>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

export interface CloudSyncPort {
  getManifest(): Promise<SyncManifestV1>;
  read(request: SyncReadRequestV1): Promise<SyncReadResponseV1>;
  commit(request: SyncCommitRequestV1): Promise<SyncCommitResultV1>;
  delete(request: SyncDeleteRequestV1): Promise<SyncDeleteResultV1>;
  deleteAccount(): Promise<void>;
}

export interface FeedbackPort {
  submit(request: FeedbackRequestV1): Promise<FeedbackReceiptV1>;
}

export type CloudRecordSelection = {
  local: SyncRecordEnvelopeV1 | null;
  remote: SyncRecordEnvelopeV1 | null;
};
