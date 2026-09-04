import type {
  NewPendingPushIntent,
  PendingPushIntent,
  PushDeviceCredentials,
  PushStatePort
} from "@sunshield/platform";
import type {
  PushDeliveryStateRecord,
  SunshieldDatabase
} from "../db/database";

const CURRENT_DEVICE_ID = "current-device" as const;

const EMPTY_STATE: PushDeliveryStateRecord = {
  id: CURRENT_DEVICE_ID,
  credentials: null,
  pendingIntent: null,
  intentRevision: 0
};

export class LocalPushStateRepository implements PushStatePort {
  readonly #database: SunshieldDatabase;

  constructor(database: SunshieldDatabase) {
    this.#database = database;
  }

  async readCredentials(): Promise<PushDeviceCredentials | null> {
    return (await this.#read()).credentials;
  }

  async writeCredentials(value: PushDeviceCredentials): Promise<void> {
    await this.#update((current) => ({ ...current, credentials: value }));
  }

  async clearCredentialsIfOwned(
    value: PushDeviceCredentials
  ): Promise<boolean> {
    let cleared = false;
    await this.#update((current) => {
      if (!sameCredentials(current.credentials, value)) return current;
      cleared = true;
      return { ...current, credentials: null };
    });
    return cleared;
  }

  async readPendingIntent(): Promise<PendingPushIntent | null> {
    return (await this.#read()).pendingIntent;
  }

  async replacePendingIntent(
    value: NewPendingPushIntent
  ): Promise<PendingPushIntent> {
    let persisted: PendingPushIntent | undefined;
    await this.#update((current) => {
      const revision = current.intentRevision + 1;
      persisted = { ...value, revision } as PendingPushIntent;
      return {
        ...current,
        pendingIntent: persisted,
        intentRevision: revision
      };
    });
    return persisted!;
  }

  async clearPendingIntent(operationId: string): Promise<void> {
    await this.#update((current) =>
      current.pendingIntent?.operationId === operationId
        ? { ...current, pendingIntent: null }
        : current
    );
  }

  async #read(): Promise<PushDeliveryStateRecord> {
    const stored =
      await this.#database.PushDeliveryState.get(CURRENT_DEVICE_ID);
    if (stored === undefined) return EMPTY_STATE;
    const intentRevision = Number.isSafeInteger(stored.intentRevision)
      ? stored.intentRevision
      : 0;
    const pendingIntentWithRevision =
      stored.pendingIntent === null ||
      Number.isSafeInteger(stored.pendingIntent.revision)
        ? stored.pendingIntent
        : { ...stored.pendingIntent, revision: Math.max(1, intentRevision) };
    const pendingIntent = normalizeLegacyRevoke(pendingIntentWithRevision);
    return {
      ...stored,
      pendingIntent,
      intentRevision: Math.max(intentRevision, pendingIntent?.revision ?? 0)
    };
  }

  async #update(
    transform: (current: PushDeliveryStateRecord) => PushDeliveryStateRecord
  ): Promise<void> {
    await this.#database.transaction(
      "rw",
      this.#database.PushDeliveryState,
      async () => {
        const current = await this.#read();
        await this.#database.PushDeliveryState.put(transform(current));
      }
    );
  }
}

function normalizeLegacyRevoke(
  intent: PendingPushIntent | null
): PendingPushIntent | null {
  if (
    intent?.kind !== "revoke" ||
    Object.hasOwn(intent, "credentialSnapshot")
  ) {
    return intent;
  }
  return {
    ...intent,
    credentialSnapshot: undefined
  };
}

function sameCredentials(
  current: PushDeviceCredentials | null,
  expected: PushDeviceCredentials
): boolean {
  return (
    current?.deviceId === expected.deviceId &&
    current.deviceSecret === expected.deviceSecret
  );
}
