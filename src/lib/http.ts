import { NextResponse } from "next/server";
import { RuleError } from "./types";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(error: unknown): NextResponse {
  if (error instanceof RuleError) {
    const status = error.code === "not_found" ? 404 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "Unexpected server error", code: "server" }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
