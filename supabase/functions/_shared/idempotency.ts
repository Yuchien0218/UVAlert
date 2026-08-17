export type IdempotencyOperation = "commit" | "delete";

type ReceiptRow = {
  response: unknown;
};

type QueryResult<T> = Promise<{ data: T; error: { message: string } | null }>;

type FilterBuilder = {
  eq(column: string, value: string): FilterBuilder;
  maybeSingle(): QueryResult<ReceiptRow | null>;
};

type DatabaseClient = {
  from(table: string): {
    select(columns?: string): FilterBuilder;
    insert(values: Record<string, unknown>): QueryResult<null>;
  };
};

export async function readIdempotencyReceipt(
  client: DatabaseClient,
  userId: string,
  operation: IdempotencyOperation,
  idempotencyKey: string
): Promise<unknown | null> {
  const result = await client
    .from("sync_idempotency_receipts")
    .select("response")
    .eq("user_id", userId)
    .eq("operation", operation)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (result.error !== null) throw new Error("IDEMPOTENCY_READ_FAILED");
  return result.data?.response ?? null;
}

export async function writeIdempotencyReceipt(
  client: DatabaseClient,
  userId: string,
  operation: IdempotencyOperation,
  idempotencyKey: string,
  response: unknown
): Promise<void> {
  const result = await client.from("sync_idempotency_receipts").insert({
    user_id: userId,
    operation,
    idempotency_key: idempotencyKey,
    response
  });
  if (result.error !== null) throw new Error("IDEMPOTENCY_WRITE_FAILED");
}
