import type {
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
  pendingIntent: null
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

  async clearCredentials(): Promise<void> {
    await this.#update((current) => ({ ...current, credentials: null }));
  }

  async readPendingIntent(): Promise<PendingPushIntent | null> {
    return (await this.#read()).pendingIntent;
  }

  async replacePendingIntent(value: PendingPushIntent): Promise<void> {
    await this.#update((current) => ({ ...current, pendingIntent: value }));
  }

  async clearPendingIntent(operationId: string): Promise<void> {
    await this.#update((current) =>
      current.pendingIntent?.operationId === operationId
        ? { ...current, pendingIntent: null }
        : current
    );
  }

  async #read(): Promise<PushDeliveryStateRecord> {
    return (
      (await this.#database.PushDeliveryState.get(CURRENT_DEVICE_ID)) ??
      EMPTY_STATE
    );
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
