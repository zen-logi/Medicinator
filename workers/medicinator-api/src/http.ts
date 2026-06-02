import type { Context } from "hono";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function badRequest(message: string) {
  return new HttpError(400, message);
}

export function forbidden(message = "Forbidden") {
  return new HttpError(403, message);
}

export function conflict(message = "Conflict") {
  return new HttpError(409, message);
}

export function notFound(message = "Not found") {
  return new HttpError(404, message);
}

export function unauthorized(message = "Unauthorized") {
  return new HttpError(401, message);
}

export async function readJson<T>(context: Context) {
  try {
    return await context.req.json<T>();
  } catch {
    throw badRequest("JSON body is required");
  }
}
