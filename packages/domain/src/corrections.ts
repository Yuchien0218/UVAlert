import { DomainInvariantError } from "./errors";

type Correctable = {
  id: string;
  sessionId: string;
  correctionAction: "create" | "replace" | "void";
  correctionOfEventId: string | null;
};

type CorrectableGroup = {
  id: string;
  sessionId: string;
  correctionAction: "create" | "replace" | "void";
  correctionOfGroupId: string | null;
};

function resolveLeaves<T extends Correctable>(
  events: ReadonlyArray<T>,
  family: (event: T) => string
): T[] {
  const byId = new Map(events.map((event) => [event.id, event]));
  const successorByTarget = new Map<string, T>();

  for (const event of events) {
    const targetId = event.correctionOfEventId;
    if (targetId === null) {
      if (event.correctionAction !== "create") {
        throw new DomainInvariantError(
          "INVALID_CORRECTION",
          `${event.id} 缺少 correction target`
        );
      }
      continue;
    }
    const target = byId.get(targetId);
    if (
      target === undefined ||
      target.sessionId !== event.sessionId ||
      family(target) !== family(event)
    ) {
      throw new DomainInvariantError(
        "INVALID_CORRECTION",
        `${event.id} 的 correction target 不存在或 family 不相符`
      );
    }
    if (successorByTarget.has(targetId)) {
      throw new DomainInvariantError(
        "CORRECTION_CONFLICT",
        `${targetId} 已有 correction successor`
      );
    }
    if (target.correctionAction === "void") {
      throw new DomainInvariantError(
        "INVALID_CORRECTION",
        `${event.id} 不得更正已 void 的事件`
      );
    }
    successorByTarget.set(targetId, event);
  }

  for (const event of events) {
    const visited = new Set<string>();
    let cursor: T | undefined = event;
    while (cursor !== undefined) {
      if (visited.has(cursor.id)) {
        throw new DomainInvariantError(
          "INVALID_CORRECTION",
          `correction graph 在 ${cursor.id} 形成 cycle`
        );
      }
      visited.add(cursor.id);
      const targetId = cursor.correctionOfEventId;
      if (targetId === null) {
        if (cursor.correctionAction !== "create") {
          throw new DomainInvariantError(
            "INVALID_CORRECTION",
            `${cursor.id} 的 correction chain 沒有 create root`
          );
        }
        break;
      }
      cursor = byId.get(targetId);
    }
  }

  const leaves: T[] = [];
  for (const event of events) {
    if (!successorByTarget.has(event.id) && event.correctionAction !== "void") {
      leaves.push(event);
    }
  }
  return leaves;
}

export function resolveEventCorrectionLeaves<T extends Correctable>(
  events: ReadonlyArray<T>,
  family: (event: T) => string
): T[] {
  return resolveLeaves(events, family);
}

export function resolveGroupCorrectionLeaves<T extends CorrectableGroup>(
  groups: ReadonlyArray<T>
): T[] {
  const adapted = groups.map((group) => ({
    ...group,
    correctionOfEventId: group.correctionOfGroupId
  }));
  return resolveLeaves(adapted, () => "application_group") as T[];
}

export function validateCorrectionGraph<T extends Correctable>(
  events: ReadonlyArray<T>,
  family: (event: T) => string
): void {
  resolveLeaves(events, family);
}
