import { generateUploadToken } from "../utils/upload.js";
import type { UploadToken } from "../utils/upload.js";

export type FileMetadata = {
  fileName: string;
  mimeType: string;
  size: number;
};

// ── requestUploadTokensService ───────────────────────────────────────────────
// Generates one signed Cloudinary upload token per file and registers each
// publicId in Redis (15-minute TTL, one-time use).
// The adminId is embedded in each Redis record so we can detect cross-admin
// token reuse at product-creation time.
// Validation is already done by the middleware; this is pure business logic.

export async function requestUploadTokensService(
  files: FileMetadata[],
  adminId: number
): Promise<UploadToken[]> {
  return Promise.all(files.map((file) => generateUploadToken(file.fileName, adminId)));
}
