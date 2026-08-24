import {
  UserPreferencesV1Schema,
  USER_PREFERENCES_SCHEMA_VERSION,
  type UserPreferencesV1
} from "@sunshield/contracts";
import type { UserPreferencesPort } from "@sunshield/platform";
import { USER_PREFERENCES_METADATA_KEY } from "./local-sync-repository";
import type { SunshieldDatabase } from "../db/database";

const DEFAULT_USER_PREFERENCES: UserPreferencesV1 = {
  schemaVersion: USER_PREFERENCES_SCHEMA_VERSION,
  reminderFrequencyMinutes: null,
  soundEnabled: false,
  vibrationEnabled: false
};

/**
 * 讀寫 `UserPreferencesV1`，本機優先——不經過雲端同步也能用。
 *
 * 跟 `LocalSyncRepository` 讀寫同一個 `AppMetadata` key
 * （`USER_PREFERENCES_METADATA_KEY`），避免同一份偏好資料出現
 * 兩個各自維護的儲存位置。
 */
export class LocalUserPreferencesRepository implements UserPreferencesPort {
  readonly #database: SunshieldDatabase;

  constructor(database: SunshieldDatabase) {
    this.#database = database;
  }

  async getReminderFrequencyMinutes(): Promise<number | null> {
    const preferences = await this.#read();
    return preferences.reminderFrequencyMinutes;
  }

  async setReminderFrequencyMinutes(minutes: number | null): Promise<void> {
    const current = await this.#read();
    const next = UserPreferencesV1Schema.parse({
      ...current,
      reminderFrequencyMinutes: minutes
    });
    await this.#database.AppMetadata.put({
      key: USER_PREFERENCES_METADATA_KEY,
      value: JSON.stringify(next)
    });
  }

  async #read(): Promise<UserPreferencesV1> {
    const stored = await this.#database.AppMetadata.get(
      USER_PREFERENCES_METADATA_KEY
    );
    if (stored === undefined) return DEFAULT_USER_PREFERENCES;

    try {
      const parsed = UserPreferencesV1Schema.safeParse(
        JSON.parse(stored.value)
      );
      return parsed.success ? parsed.data : DEFAULT_USER_PREFERENCES;
    } catch {
      return DEFAULT_USER_PREFERENCES;
    }
  }
}
