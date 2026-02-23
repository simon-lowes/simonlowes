import type { Context } from "hono";
import type { Env } from "../index";

export async function handleDelete(c: Context<{ Bindings: Env }>) {
  // The key is everything after /media/ in the URL path
  const key = c.req.param("key");

  if (!key) {
    return c.json({ error: "No file key provided" }, 400);
  }

  // Check the file exists before deleting
  const object = await c.env.MEDIA_BUCKET.head(key);
  if (!object) {
    return c.json({ error: "File not found" }, 404);
  }

  await c.env.MEDIA_BUCKET.delete(key);

  return c.json({ ok: true });
}
