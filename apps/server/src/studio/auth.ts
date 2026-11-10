// Passcode gate for the studio: one shared passcode, a signed session cookie, and a refusal to listen on the network without one.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { env } from "../config";

const COOKIE = "clipforge_studio";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function assertSafeHost(host: string, passcode: string | undefined): void {
  if (!LOCAL_HOSTS.has(host) && !passcode) {
    throw new Error(`HOST=${host} would put the studio on your network with no lock. Set STUDIO_PASSCODE in .env first.`);
  }
}

const token = (passcode: string) => createHmac("sha256", passcode).update("clipforge-studio-session").digest("hex");

function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isAuthed(c: Context, passcode = env.STUDIO_PASSCODE): boolean {
  if (!passcode) return true;
  const cookie = getCookie(c, COOKIE);
  return cookie ? same(cookie, token(passcode)) : false;
}

export function login(c: Context, attempt: string, passcode = env.STUDIO_PASSCODE): boolean {
  if (!passcode) return true;
  if (!same(attempt, passcode)) return false;
  setCookie(c, COOKIE, token(passcode), { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return true;
}

// Decision: only the login endpoint and the page shell are open; every API call and every file needs the session cookie.
export function requireStudioAuth(passcode = env.STUDIO_PASSCODE): MiddlewareHandler {
  return async (c, next) => {
    if (!passcode || c.req.path === "/api/auth" || isAuthed(c, passcode)) return next();
    return c.json({ error: "Locked. Enter the studio passcode." }, 401);
  };
}
