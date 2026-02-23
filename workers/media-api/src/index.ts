import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./auth";
import { handleUpload } from "./handlers/upload";
import { handleList } from "./handlers/list";
import { handleDelete } from "./handlers/delete";

export interface Env {
  MEDIA_BUCKET: R2Bucket;
  TINA_CLIENT_ID: string;
  ALLOWED_ORIGIN: string;
  PUBLIC_MEDIA_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS — only allow the site origin
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.ALLOWED_ORIGIN;
      // Also allow localhost for dev
      if (origin === allowed || origin?.startsWith("http://localhost")) {
        return origin;
      }
      return "";
    },
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  })
);

// Health check (no auth)
app.get("/health", (c) => c.json({ ok: true }));

// All /media routes require auth
app.use("/media/*", authMiddleware);
app.use("/media", authMiddleware);

// Routes
app.post("/media", handleUpload);
app.get("/media", handleList);
app.delete("/media/:key{.+}", handleDelete);

export default app;
