import type { Client, Media, MediaList, MediaStore, MediaUploadOptions } from "tinacms";

const MEDIA_API_URL = "https://media-api.simonlowes.com";

export default class R2MediaStore implements MediaStore {
  private fetchWithToken: (input: RequestInfo, init?: RequestInit) => Promise<Response>;

  accept = "image/*,audio/*,video/*,application/pdf";
  maxSize = 100 * 1024 * 1024; // 100MB — matches Worker validation

  constructor(client: Client) {
    this.fetchWithToken = client.authProvider.fetchWithToken.bind(client.authProvider);
  }

  async persist(files: MediaUploadOptions[]): Promise<Media[]> {
    const uploaded: Media[] = [];

    for (const { file, directory } of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("directory", directory);

      const res = await this.fetchWithToken(`${MEDIA_API_URL}/media`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(`Upload failed: ${(err as Record<string, string>).error}`);
      }

      uploaded.push(await res.json());
    }

    return uploaded;
  }

  async delete(media: Media): Promise<void> {
    const key = media.id;
    const res = await this.fetchWithToken(`${MEDIA_API_URL}/media/${key}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`Delete failed: ${(err as Record<string, string>).error}`);
    }
  }

  async list(options?: {
    directory?: string;
    limit?: number;
    offset?: string | number;
  }): Promise<MediaList> {
    const params = new URLSearchParams();
    if (options?.directory) params.set("directory", options.directory);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset !== undefined) params.set("offset", String(options.offset));

    const url = `${MEDIA_API_URL}/media?${params}`;
    const res = await this.fetchWithToken(url);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(`List failed: ${(err as Record<string, string>).error}`);
    }

    return res.json();
  }
}
