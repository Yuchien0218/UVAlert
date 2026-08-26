import { SetupDraftV1Schema, type SetupDraftV1 } from "@sunshield/contracts";
import type { SetupDraftRepositoryPort } from "@sunshield/platform";
import { SunshieldDatabase } from "../db/database";

export class LocalSetupDraftRepository implements SetupDraftRepositoryPort {
  readonly #database: SunshieldDatabase;

  constructor(database: SunshieldDatabase) {
    this.#database = database;
  }

  async getActiveDraft(
    ownerKey: string,
    trustedNow: string
  ): Promise<SetupDraftV1 | null> {
    const storedDraft = await this.#database.SetupDrafts.get(ownerKey);
    if (storedDraft === undefined) return null;

    const parsed = SetupDraftV1Schema.safeParse(storedDraft);
    if (
      !parsed.success ||
      parsed.data.ownerKey !== ownerKey ||
      Date.parse(parsed.data.expiresAt) <= Date.parse(trustedNow)
    ) {
      await this.#database.SetupDrafts.delete(ownerKey);
      return null;
    }

    return parsed.data;
  }

  async saveDraft(draft: SetupDraftV1): Promise<void> {
    const parsed = SetupDraftV1Schema.parse(draft);
    await this.#database.SetupDrafts.put(parsed);
  }

  async deleteDraft(draftId: string): Promise<void> {
    await this.#database.SetupDrafts.delete(draftId);
  }
}
