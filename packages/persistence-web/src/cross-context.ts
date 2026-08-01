export type InvalidationMessage = {
  kind: "data-committed" | "data-cleared";
  sourceContextId: string;
  sessionId?: string;
  revision?: number;
};

export interface CrossContextNotifier {
  publish(message: InvalidationMessage): void;
  subscribe(listener: (message: InvalidationMessage) => void): () => void;
}

export const CROSS_CONTEXT_CHANNEL_NAME = "sunshield-advisor:p0:data";

export class BroadcastChannelNotifier implements CrossContextNotifier {
  readonly #channel: BroadcastChannel | null;
  readonly #listeners = new Set<(message: InvalidationMessage) => void>();

  constructor(channelName = CROSS_CONTEXT_CHANNEL_NAME) {
    this.#channel =
      typeof globalThis.BroadcastChannel === "function"
        ? new globalThis.BroadcastChannel(channelName)
        : null;
    this.#channel?.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (isInvalidationMessage(event.data)) {
        for (const listener of this.#listeners) {
          listener(event.data);
        }
      }
    });
  }

  publish(message: InvalidationMessage): void {
    this.#channel?.postMessage(message);
  }

  subscribe(listener: (message: InvalidationMessage) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  close(): void {
    this.#listeners.clear();
    this.#channel?.close();
  }
}

export class NoopCrossContextNotifier implements CrossContextNotifier {
  publish(_message: InvalidationMessage): void {}

  subscribe(_listener: (message: InvalidationMessage) => void): () => void {
    return () => undefined;
  }
}

function isInvalidationMessage(value: unknown): value is InvalidationMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<InvalidationMessage>;
  return (
    (candidate.kind === "data-committed" ||
      candidate.kind === "data-cleared") &&
    typeof candidate.sourceContextId === "string"
  );
}

