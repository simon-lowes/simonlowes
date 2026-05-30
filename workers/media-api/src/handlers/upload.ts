import type { Context } from "hono";
import type { Env } from "../index";

const ALLOWED_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  // Audio
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
  // Video
  "video/mp4",
  "video/webm",
  "video/ogg",
  // Documents
  "application/pdf",
]);

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export async function handleUpload(c: Context<{ Bindings: Env }>) {
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const rawDir = (formData.get("directory") as string) || "";
  // Sanitize directory: strip leading/trailing slashes and drop any ".." segments.
  const directory = rawDir
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter((seg) => seg && seg !== "." && seg !== "..")
    .join("/");

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: `File type not allowed: ${file.type}` }, 400);
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` }, 400);
  }

  // Sanitize filename to a safe basename: strip path separators, reject "..",
  // and restrict to [A-Za-z0-9._-] (other chars replaced with "_").
  const baseName = file.name.split(/[\\/]/).pop() || "";
  const safeName = baseName.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+$/, "_") || "file";

  // Build the R2 key: directory/filename (no leading slash)
  const key = directory ? `${directory}/${safeName}` : safeName;

  await c.env.MEDIA_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const publicUrl = `${c.env.PUBLIC_MEDIA_URL}/${key}`;

  return c.json({
    type: "file" as const,
    id: key,
    filename: file.name,
    directory,
    src: publicUrl,
  });
}
