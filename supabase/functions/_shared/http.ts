export type ErrorResponseInput = {
  status: number;
  code: string;
  message: string;
  requestId?: string;
};

export type ErrorResponseData = {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};

export type ErrorResponse = {
  status: number;
  headers: Record<string, string>;
  json: ErrorResponseData;
};

export function errorResponse(input: ErrorResponseInput): ErrorResponse {
  const error: ErrorResponseData["error"] = {
    code: input.code,
    message: input.message
  };

  if (input.requestId !== undefined) {
    error.requestId = input.requestId;
  }

  return {
    status: input.status,
    headers: {
      "Content-Type": "application/json"
    },
    json: { error }
  };
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}

export function toResponse(response: ErrorResponse): Response {
  return jsonResponse(response.json, response.status, response.headers);
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    Vary: "Origin"
  };
  if (origin !== null && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function withCors(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    headers
  });
}
