export class DomainInvariantError extends Error {
  readonly code:
    | "CORRECTION_CONFLICT"
    | "INVALID_CORRECTION"
    | "INVALID_APPLICATION_PARTITION"
    | "INVALID_WATER_INTERVAL"
    | "INVALID_EVENT_STREAM";

  constructor(
    code: DomainInvariantError["code"],
    message: string
  ) {
    super(message);
    this.name = "DomainInvariantError";
    this.code = code;
  }
}

