import type { Context } from "hono";
import type { Env } from "../index";

export async function handleList(c: Context<{ Bindings: Env }>) {
  const rawDir = c.req.query("directory") || "";
  const directory = rawDir.replace(/^\/+|\/+$/g, ""); // strip leading/trailing slashes
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = c.req.query("offset") || undefined;

  // Use delimiter to get virtual directories (folder browsing)
  const prefix = directory ? `${directory}/` : "";
  const listed = await c.env.MEDIA_BUCKET.list({
    prefix,
    delimiter: "/",
    limit,
    cursor: offset,
  });

  const items: Array<{
    type: "file" | "dir";
    id: string;
    filename: string;
    directory: string;
    src?: string;
  }> = [];

  // Add virtual directories (common prefixes)
  if (listed.delimitedPrefixes) {
    for (const dirPrefix of listed.delimitedPrefixes) {
      // dirPrefix is e.g. "blog/images/" — extract the folder name
      const trimmed = dirPrefix.endsWith("/") ? dirPrefix.slice(0, -1) : dirPrefix;
      const parts = trimmed.split("/");
      const folderName = parts[parts.length - 1];
      items.push({
        type: "dir",
        id: trimmed,
        filename: folderName,
        directory: parts.slice(0, -1).join("/"),
      });
    }
  }

  // Add files
  for (const object of listed.objects) {
    const parts = object.key.split("/");
    const filename = parts[parts.length - 1];
    const dir = parts.slice(0, -1).join("/");
    items.push({
      type: "file",
      id: object.key,
      filename,
      directory: dir,
      src: `${c.env.PUBLIC_MEDIA_URL}/${object.key}`,
    });
  }

  return c.json({
    items,
    nextOffset: listed.truncated ? listed.cursor : undefined,
  });
}
