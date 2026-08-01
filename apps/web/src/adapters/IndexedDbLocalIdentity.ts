import { type SunshieldDatabase } from "@sunshield/persistence-web";
import type {
  DeviceIdentityPort,
  LocalIdentityPort
} from "@sunshield/platform";

const LOCAL_VISITOR_ID_KEY = "localVisitorId";
const DEVICE_LOCAL_ID_KEY = "deviceLocalId";

export class IndexedDbLocalIdentity
  implements LocalIdentityPort, DeviceIdentityPort
{
  readonly #database: SunshieldDatabase;
  readonly #createId: () => string;

  constructor(options: {
    database: SunshieldDatabase;
    createId: () => string;
  }) {
    this.#database = options.database;
    this.#createId = options.createId;
  }

  async getOrCreateLocalVisitorId(): Promise<string> {
    return this.#getOrCreateId(LOCAL_VISITOR_ID_KEY);
  }

  async getOrCreateDeviceLocalId(): Promise<string> {
    return this.#getOrCreateId(DEVICE_LOCAL_ID_KEY);
  }

  async #getOrCreateId(key: string): Promise<string> {
    return this.#database.transaction(
      "rw",
      this.#database.AppMetadata,
      async () => {
        const existing = await this.#database.AppMetadata.get(key);
        if (existing !== undefined) return existing.value;

        const id = this.#createId();
        await this.#database.AppMetadata.add({
          key,
          value: id
        });
        return id;
      }
    );
  }
}
