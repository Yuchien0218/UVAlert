import { shallowReadonly, shallowRef, type ShallowRef } from "vue";
import {
  SYNC_SCHEMA_VERSION,
  SyncCommitResultV1Schema,
  type SyncCommitRecordV1,
  type SyncCommitTombstoneV1,
  type SyncManifestV1,
  type SyncRecordEnvelopeV1,
  type SyncRecordKey,
  type SyncRecordSummaryV1,
  type SyncTombstoneV1
} from "@sunshield/contracts";
import type {
  CloudError,
  CloudSyncPort,
  LocalSyncPort,
  LocalSyncSnapshot
} from "@sunshield/platform";

export type SyncItemStatus =
  | "local_only"
  | "remote_only"
  | "unchanged"
  | "conflict"
  | "local_deleted"
  | "remote_deleted";

export type SyncAction = "upload" | "download" | "skip";

export type SyncPreviewItem = {
  key: SyncRecordKey;
  status: SyncItemStatus;
  localRecord: SyncRecordEnvelopeV1 | null;
  localTombstone: SyncTombstoneV1 | null;
  remoteSummary: SyncRecordSummaryV1 | null;
  remoteTombstone: SyncTombstoneV1 | null;
  defaultAction: SyncAction | null;
};

export type SyncPreview = {
  createdAt: string;
  items: SyncPreviewItem[];
};

export type SyncSelection = {
  actions: Record<string, SyncAction>;
};

export type SyncControllerStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "syncing"
  | "synced"
  | "cancelled"
  | "error";

export type SyncControllerState = {
  status: SyncControllerStatus;
  preview: SyncPreview | null;
  error: CloudError | null;
};

export interface SyncController {
  readonly state: Readonly<ShallowRef<SyncControllerState>>;
  preparePreview(): Promise<SyncPreview | null>;
  confirm(selection?: SyncSelection): Promise<boolean>;
  cancelPreview(): void;
  reset(): void;
  dispose(): void;
}

export function createSyncController(options: {
  local: LocalSyncPort;
  cloud: CloudSyncPort;
  createId?: () => string;
}): SyncController {
  const state = shallowRef<SyncControllerState>({
    status: "idle",
    preview: null,
    error: null
  });
  const createId = options.createId ?? (() => crypto.randomUUID());
  let disposed = false;

  async function preparePreview(): Promise<SyncPreview | null> {
    if (disposed) return null;
    state.value = { status: "preparing", preview: null, error: null };
    try {
      const [localSnapshot, manifest] = await Promise.all([
        options.local.collectSyncSnapshot(),
        options.cloud.getManifest()
      ]);
      const preview = buildSyncPreview(localSnapshot, manifest);
      state.value = { status: "ready", preview, error: null };
      return preview;
    } catch (error) {
      state.value = {
        status: "error",
        preview: null,
        error: toCloudError(error)
      };
      return null;
    }
  }

  async function confirm(selection?: SyncSelection): Promise<boolean> {
    const canContinueWithPreview =
      state.value.status === "ready" ||
      (state.value.status === "error" && state.value.preview !== null);
    if (disposed || !canContinueWithPreview || state.value.preview === null) {
      return false;
    }
    const preview = state.value.preview;
    const actions = selection?.actions ?? defaultActions(preview);
    let operation: PreparedSyncOperation;
    try {
      operation = prepareOperation(preview, actions);
    } catch (error) {
      state.value = {
        status: "error",
        preview,
        error: toCloudError(error, "SYNC_SELECTION_INVALID")
      };
      return false;
    }

    state.value = { status: "syncing", preview, error: null };
    try {
      // 先讀取，再提交；只要任何 cloud request 失敗，就還沒碰本機資料。
      const remote =
        operation.readKeys.length === 0
          ? null
          : await options.cloud.read({
              schemaVersion: SYNC_SCHEMA_VERSION,
              recordKeys: operation.readKeys
            });
      const committed =
        operation.commitRecords.length === 0 &&
        operation.commitTombstones.length === 0
          ? null
          : await options.cloud.commit({
              schemaVersion: SYNC_SCHEMA_VERSION,
              idempotencyKey: createId(),
              records: operation.commitRecords,
              tombstones: operation.commitTombstones
            });
      const parsedCommitted =
        committed === null
          ? null
          : SyncCommitResultV1Schema.parse(committed);

      const recordsToApply = [
        ...(remote?.records ?? []),
        ...applyCommittedRevisions(
          operation.uploadRecords,
          parsedCommitted?.committedRecords ?? []
        )
      ];
      const tombstonesToApply = [
        ...(remote?.tombstones ?? []),
        ...(parsedCommitted?.committedTombstones ?? [])
      ];
      if (recordsToApply.length > 0) {
        await options.local.applySelectedRecords(recordsToApply);
      }
      if (tombstonesToApply.length > 0) {
        await options.local.applyTombstones(tombstonesToApply);
      }
      state.value = { status: "synced", preview: null, error: null };
      return true;
    } catch (error) {
      state.value = {
        status: "error",
        preview,
        error: toCloudError(error)
      };
      return false;
    }
  }

  function cancelPreview(): void {
    if (disposed) return;
    state.value = { status: "cancelled", preview: null, error: null };
  }

  function reset(): void {
    if (disposed) return;
    state.value = { status: "idle", preview: null, error: null };
  }

  return {
    state: shallowReadonly(state),
    preparePreview,
    confirm,
    cancelPreview,
    reset,
    dispose(): void {
      disposed = true;
    }
  };
}

function buildSyncPreview(
  local: LocalSyncSnapshot,
  manifest: SyncManifestV1
): SyncPreview {
  const localRecords = new Map(
    local.records.map((record) => [recordKey(record.recordKind, record.recordId), record])
  );
  const localTombstones = new Map(
    local.tombstones.map((tombstone) => [recordKey(tombstone.recordKind, tombstone.recordId), tombstone])
  );
  const remoteRecords = new Map(
    manifest.records.map((summary) => [recordKey(summary.recordKind, summary.recordId), summary])
  );
  const remoteTombstones = new Map(
    manifest.tombstones.map((tombstone) => [recordKey(tombstone.recordKind, tombstone.recordId), tombstone])
  );
  const keys = new Set([
    ...localRecords.keys(),
    ...localTombstones.keys(),
    ...remoteRecords.keys(),
    ...remoteTombstones.keys()
  ]);

  const items: SyncPreviewItem[] = [];
  for (const key of keys) {
    const localRecord = localRecords.get(key) ?? null;
    const localTombstone = localTombstones.get(key) ?? null;
    const remoteSummary = remoteRecords.get(key) ?? null;
    const remoteTombstone = remoteTombstones.get(key) ?? null;
    const status = classifyItem(
      localRecord,
      localTombstone,
      remoteSummary,
      remoteTombstone
    );
    items.push({
      key: parseRecordKey(key),
      status,
      localRecord,
      localTombstone,
      remoteSummary,
      remoteTombstone,
      defaultAction: defaultActionFor(status)
    });
  }

  items.sort((a, b) =>
    recordKey(a.key.recordKind, a.key.recordId).localeCompare(
      recordKey(b.key.recordKind, b.key.recordId)
    )
  );
  return { createdAt: local.collectedAt, items };
}

function classifyItem(
  localRecord: SyncRecordEnvelopeV1 | null,
  localTombstone: SyncTombstoneV1 | null,
  remoteSummary: SyncRecordSummaryV1 | null,
  remoteTombstone: SyncTombstoneV1 | null
): SyncItemStatus {
  if (localTombstone !== null) {
    if (remoteTombstone !== null) {
      return localTombstone.revision === remoteTombstone.revision
        ? "unchanged"
        : "conflict";
    }
    return remoteSummary === null ? "local_deleted" : "conflict";
  }
  if (remoteTombstone !== null) {
    return localRecord === null ? "remote_deleted" : "conflict";
  }
  if (localRecord === null) return "remote_only";
  if (remoteSummary === null) return "local_only";
  return localRecord.payloadFingerprint === remoteSummary.payloadFingerprint
    ? "unchanged"
    : "conflict";
}

function defaultActionFor(status: SyncItemStatus): SyncAction | null {
  if (status === "local_only" || status === "local_deleted") return "upload";
  if (status === "remote_only" || status === "remote_deleted") return "download";
  return status === "unchanged" ? "skip" : null;
}

function defaultActions(preview: SyncPreview): Record<string, SyncAction> {
  return Object.fromEntries(
    preview.items
      .filter((item): item is SyncPreviewItem & { defaultAction: SyncAction } => item.defaultAction !== null)
      .map((item) => [recordKey(item.key.recordKind, item.key.recordId), item.defaultAction])
  );
}

type PreparedSyncOperation = {
  readKeys: SyncRecordKey[];
  commitRecords: SyncCommitRecordV1[];
  commitTombstones: SyncCommitTombstoneV1[];
  uploadRecords: SyncRecordEnvelopeV1[];
};

function prepareOperation(
  preview: SyncPreview,
  actions: Record<string, SyncAction>
): PreparedSyncOperation {
  const operation: PreparedSyncOperation = {
    readKeys: [],
    commitRecords: [],
    commitTombstones: [],
    uploadRecords: []
  };
  for (const item of preview.items) {
    const key = recordKey(item.key.recordKind, item.key.recordId);
    const action = actions[key] ?? item.defaultAction;
    if (action === undefined || action === null) {
      throw makeSelectionError(
        `請先選擇「${item.key.recordId}」要保留本機或雲端版本`
      );
    }
    if (action === "skip") continue;
    if (action === "download") {
      if (item.remoteSummary === null && item.remoteTombstone === null) {
        throw makeSelectionError("找不到要下載的雲端資料");
      }
      operation.readKeys.push(item.key);
      continue;
    }
    if (item.localRecord !== null) {
      operation.commitRecords.push({
        record: item.localRecord,
        expectedRevision: item.remoteSummary?.revision ?? null
      });
      operation.uploadRecords.push(item.localRecord);
    } else if (item.localTombstone !== null) {
      operation.commitTombstones.push({
        tombstone: item.localTombstone,
        expectedRevision:
          item.remoteSummary?.revision ?? item.remoteTombstone?.revision ?? null
      });
    } else {
      throw makeSelectionError("找不到要上傳的本機資料");
    }
  }
  return operation;
}

function applyCommittedRevisions(
  records: SyncRecordEnvelopeV1[],
  summaries: SyncRecordSummaryV1[]
): SyncRecordEnvelopeV1[] {
  return records.map((record) => {
    const summary = summaries.find(
      (candidate) =>
        candidate.recordKind === record.recordKind &&
        candidate.recordId === record.recordId
    );
    return summary === undefined
      ? record
      : {
          ...record,
          revision: summary.revision,
          payloadFingerprint: summary.payloadFingerprint,
          updatedAt: summary.updatedAt
        };
  });
}

function recordKey(recordKind: string, recordId: string): string {
  return `${recordKind}:${recordId}`;
}

function parseRecordKey(value: string): SyncRecordKey {
  const separator = value.indexOf(":");
  return {
    recordKind: value.slice(0, separator) as SyncRecordKey["recordKind"],
    recordId: value.slice(separator + 1)
  };
}

function makeSelectionError(message: string): CloudError {
  return { status: 422, code: "VALIDATION_ERROR", message };
}

function toCloudError(error: unknown, fallbackCode = "SERVER_ERROR"): CloudError {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "code" in error &&
    typeof error.status === "number" &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error as CloudError;
  }
  return {
    status: 500,
    code: fallbackCode as CloudError["code"],
    message: "同步尚未完成，本機資料沒有因雲端錯誤被刪除",
    cause: error
  };
}
