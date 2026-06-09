import type { Context } from "hono";
import type { Env } from "../index";

const ALLOWED_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // NOTE: image/svg+xml is intentionally NOT allowed. SVGs can embed <script>
  // and event-handler attributes; because media is served inline from the
  // public bucket (PUBLIC_MEDIA_URL) it would execute as stored XSS.
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

// Number of leading bytes needed to identify the supported formats.
const SNIFF_BYTES = 16;

/**
 * Detect the content type from the file's leading bytes (magic numbers).
 * Returns the detected MIME type, or null if it does not match any supported
 * binary format. This prevents trusting the client-supplied Content-Type,
 * which is fully attacker-controlled.
 */
function sniffContentType(bytes: Uint8Array): string | null {
  const startsWith = (sig: number[], offset = 0): boolean =>
    sig.every((b, i) => bytes[offset + i] === b);

  // ASCII helper for container/box matching.
  const asciiAt = (offset: number, str: string): boolean =>
    [...str].every((ch, i) => bytes[offset + i] === ch.charCodeAt(0));

  // Images
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return "image/gif"; // GIF8
  // RIFF....WEBP
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && asciiAt(8, "WEBP")) return "image/webp";

  // ISO Base Media File Format (....ftyp<brand>) — covers MP4, M4A, AVIF, etc.
  if (asciiAt(4, "ftyp")) {
    if (asciiAt(8, "avif") || asciiAt(8, "avis")) return "image/avif";
    if (asciiAt(8, "M4A")) return "audio/mp4";
    // Common MP4 brands (isom, mp42, mp41, dash, iso2, etc.) -> treat as video.
    return "video/mp4";
  }

  // Audio
  if (startsWith([0x49, 0x44, 0x33])) return "audio/mpeg"; // ID3 (MP3)
  // AAC ADTS frame sync (must be checked before MPEG audio sync: ADTS uses
  // 0xFFF1/0xFFF9 which overlaps the 0xFFFx MPEG sync space).
  if (startsWith([0xff, 0xf1]) || startsWith([0xff, 0xf9])) return "audio/aac";
  if (startsWith([0xff, 0xfb]) || startsWith([0xff, 0xf3]) || startsWith([0xff, 0xf2]))
    return "audio/mpeg"; // MPEG audio frame sync
  if (startsWith([0x66, 0x4c, 0x61, 0x43])) return "audio/flac"; // fLaC
  // RIFF....WAVE
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && asciiAt(8, "WAVE")) return "audio/wav";
  // OGG container — used by audio/ogg and video/ogg. Disambiguating requires
  // deeper parsing; treat as audio/ogg (the more common case).
  if (startsWith([0x4f, 0x67, 0x67, 0x53])) return "audio/ogg"; // OggS

  // Video
  // WebM / Matroska (EBML header) — also used by audio/webm.
  if (startsWith([0x1a, 0x45, 0xdf, 0xa3])) return "video/webm";

  // Documents
  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF

  return null;
}

export async function handleUpload(c: Context<{ Bindings: Env }>) {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid form data" }, 400);
  }
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

  // Fast reject on the client-declared type before reading the body. This is
  // NOT trusted on its own — the actual bytes are verified below.
  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: `File type not allowed: ${file.type}` }, 400);
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` }, 400);
  }

  // Read the body once so we can both verify it and store it. file.size is
  // already bounded by the MAX_SIZE check above.
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_SIZE) {
    return c.json({ error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` }, 400);
  }

  // Verify the real content type from magic bytes instead of trusting the
  // client-supplied Content-Type. Reject anything we can't positively
  // identify as an allowed binary format (e.g. HTML/SVG/JS polyglots).
  const head = new Uint8Array(buffer.slice(0, SNIFF_BYTES));
  const detectedType = sniffContentType(head);
  if (!detectedType || !ALLOWED_TYPES.has(detectedType)) {
    return c.json({ error: "File content does not match an allowed type" }, 400);
  }

  // Sanitize filename to a safe basename: strip path separators, reject "..",
  // and restrict to [A-Za-z0-9._-] (other chars replaced with "_").
  const baseName = file.name.split(/[\\/]/).pop() || "";
  const safeName = baseName.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+$/, "_") || "file";

  // Build the R2 key: directory/filename (no leading slash)
  const key = directory ? `${directory}/${safeName}` : safeName;

  // Store the server-detected content type, never the client-supplied one.
  await c.env.MEDIA_BUCKET.put(key, buffer, {
    httpMetadata: { contentType: detectedType },
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
