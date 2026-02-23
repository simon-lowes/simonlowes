import type { Context, Next } from "hono";
import type { Env } from "./index";

/**
 * Verify Tina Cloud JWT by calling the identity API.
 * The token comes from the browser's GitHub OAuth login via Tina Cloud —
 * we validate it by asking Tina's identity service if it's real.
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const clientId = c.env.TINA_CLIENT_ID;

  try {
    const res = await fetch(`https://identity.tinajs.io/v2/apps/${clientId}/currentUser`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }
  } catch {
    return c.json({ error: "Auth verification failed" }, 500);
  }

  await next();
}
