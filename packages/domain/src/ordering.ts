type OrderedEvent = {
  id: string;
  effectiveOccurredAt: string;
  clientSequence: number;
  localAppliedSequence: number;
};

export function compareEventOrder(
  left: OrderedEvent,
  right: OrderedEvent
): number {
  return (
    Date.parse(left.effectiveOccurredAt) -
      Date.parse(right.effectiveOccurredAt) ||
    left.clientSequence - right.clientSequence ||
    left.localAppliedSequence - right.localAppliedSequence ||
    left.id.localeCompare(right.id)
  );
}

export function compareCommandOrder(
  left: OrderedEvent,
  right: OrderedEvent
): number {
  return (
    left.localAppliedSequence - right.localAppliedSequence ||
    left.clientSequence - right.clientSequence ||
    Date.parse(left.effectiveOccurredAt) -
      Date.parse(right.effectiveOccurredAt) ||
    left.id.localeCompare(right.id)
  );
}

export function compareApplicationOrder(
  left: OrderedEvent & { appliedAt: string },
  right: OrderedEvent & { appliedAt: string }
): number {
  return (
    Date.parse(left.appliedAt) - Date.parse(right.appliedAt) ||
    compareEventOrder(left, right)
  );
}

export function minInstant(
  values: ReadonlyArray<string | null | undefined>
): string | null {
  let result: string | null = null;
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    if (result === null || Date.parse(value) < Date.parse(result)) {
      result = value;
    }
  }
  return result;
}

export function addMinutes(instant: string, minutes: number): string {
  return new Date(Date.parse(instant) + minutes * 60_000).toISOString();
}

export function uniqueStable<T>(values: ReadonlyArray<T>): T[] {
  return [...new Set(values)];
}

