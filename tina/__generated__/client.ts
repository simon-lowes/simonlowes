import { createClient } from "tinacms/dist/client";
import { queries } from "./types";
export const client = createClient({
  cacheDir:
    "/Users/simonlowes/Library/Mobile Documents/com~apple~CloudDocs/Coding/SLCOMFEB24/simonlowes/tina/__generated__/.cache/1771743403719",
  url: "https://content.tinajs.io/2.1/content/bfeec02e-0883-4bc0-967d-e067b84813b0/github/main",
  token: "66aa58e596aa55bba9b5a1ac8b83a1dc66ebf14e",
  queries,
});
export default client;
