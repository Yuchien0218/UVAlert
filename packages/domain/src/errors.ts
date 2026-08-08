export class DomainInvariantError extends Error {
  readonly code:
    | "CORRECTION_CONFLICT"
    | "INVALID_CORRECTION"
    | "INVALID_APPLICATION_PARTITION"
    | "INVALID_WATER_INTERVAL"
    | "INVALID_EVENT_STREAM"
    /** 使用者自陳的事件時間晚於可信現在（S-09）。 */
    | "FUTURE_EVENT";

  constructor(
    code: DomainInvariantError["code"],
    message: string
  ) {
    super(message);
    this.name = "DomainInvariantError";
    this.code = code;
  }
}

