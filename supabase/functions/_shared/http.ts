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
