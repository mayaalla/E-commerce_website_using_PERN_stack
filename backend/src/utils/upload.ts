import crypto from "crypto";
import env from "../config/env.js";
import redis from "./redis.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type UploadToken = {
  /** The Cloudinary public_id the client MUST use when uploading. */
  publicId: string;
  /** HMAC-SHA1 signature the client sends to Cloudinary with the upload. */
  signature: string;
  /** Unix timestamp embedded in the signature (Cloudinary rejects if > 15 min old). */
  timestamp: number;
  apiKey: string;
  cloudName: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const FOLDER = "products";
const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes – matches Cloudinary's signed-upload window
const MAX_IMAGES_PER_PRODUCT = 8;

export { MAX_IMAGES_PER_PRODUCT };

// ── Redis key helper ─────────────────────────────────────────────────────────

// Pattern: upload:token:<publicId>
function uploadTokenKey(publicId: string): string {
  return `upload:token:${publicId}`;
}

// ── generateUploadToken ──────────────────────────────────────────────────────
// Creates ONE signed upload token for a file and registers the publicId in
// Redis so we can verify it was actually issued by us when the product is saved.
//
// Cloudinary signed-upload signature algorithm (params MUST be sorted
// alphabetically, secret appended with no separator):
//
//   params = "public_id=<publicId>&timestamp=<unix>"
//   signature = SHA-1(params + CLOUDINARY_API_SECRET)
//
// Using `public_id` in the signed params binds the upload to the exact path
// we generated.  Cloudinary will reject any upload that tries to use a
// different public_id with this signature — preventing path-hijacking.
//
// The `adminId` is stored in Redis alongside `issuedAt` so we can detect
// cross-admin token reuse (token theft) at confirm time.
//
export async function generateUploadToken(
  _fileName: string,
  adminId: number
): Promise<UploadToken> {
  const timestamp = Math.floor(Date.now() / 1000);
  // Generate a UUID and prefix it with the folder so Cloudinary stores the
  // file under products/<uuid>.  Including the folder in public_id means we
  // do NOT need to send a separate `folder` param — the path is fully locked.
  const publicId = `${FOLDER}/${crypto.randomUUID()}`;

  // Params MUST be sorted alphabetically for the signature to be valid.
  // "public_id" < "timestamp"  ✓
  const paramString = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramString + env.CLOUDINARY_API_SECRET)
    .digest("hex");

  // Register the token in Redis with a 15-min TTL.
  // Storing adminId lets us detect cross-admin reuse at verification time.
  await redis.set(
    uploadTokenKey(publicId),
    JSON.stringify({ issuedAt: timestamp, adminId }),
    { ex: TOKEN_TTL_SECONDS }
  );

  return {
    publicId,
    signature,
    timestamp,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  };
}

// ── verifyAndConsumeToken ────────────────────────────────────────────────────
// Called inside createProductService for each imageUpload entry.
//
// Steps:
//   1. Check the publicId exists in Redis — confirms it was issued by us and
//      hasn't expired.
//   2. Guard against cross-admin reuse: token's adminId must match the caller.
//   3. Verify the Cloudinary response signature:
//        SHA-1 of "public_id=<publicId>&version=<version>" + apiSecret
//      This proves the file was genuinely uploaded to Cloudinary (Cloudinary
//      signs its own response with our API secret).
//   4. Delete the Redis key atomically — makes the token one-time-use (replay-proof).
//   5. Return the permanent secure_url to be stored in the DB.
//
// Throws a descriptive Error on any failure so the controller maps it to 422.
//
export async function verifyAndConsumeToken(
  publicId: string,
  version: number,
  signature: string,
  adminId: number
): Promise<string> {
  // ── Step 1: Token must exist in Redis ────────────────────────────────────
  // Upstash Redis auto-deserializes stored JSON, so type the generic as the
  // actual object shape rather than `string` to avoid a redundant JSON.parse
  // that would receive "[object Object]" and throw a SyntaxError.
  const stored = await redis.get<{ issuedAt: number; adminId: number }>(
    uploadTokenKey(publicId)
  );
  if (!stored) {
    throw new Error(
      `Upload verification failed: token not found or expired for publicId "${publicId}"`
    );
  }

  // ── Step 2: Cross-admin reuse guard ──────────────────────────────────────
  if (stored.adminId !== adminId) {
    // Consume the token immediately to prevent further probing.
    await redis.del(uploadTokenKey(publicId));
    throw new Error(
      `Upload verification failed: token was not issued for this admin (publicId "${publicId}")`
    );
  }

  // ── Step 3: Verify Cloudinary response signature ─────────────────────────
  // Cloudinary signs its response with:
  //   SHA-1("public_id=<publicId>&version=<version>" + API_SECRET)
  // (params sorted alphabetically; "public_id" < "version" ✓)
  const paramString = `public_id=${publicId}&version=${version}`;
  const expected = crypto
    .createHash("sha1")
    .update(paramString + env.CLOUDINARY_API_SECRET)
    .digest("hex");

  if (expected !== signature) {
    throw new Error(
      `Upload verification failed: signature mismatch for publicId "${publicId}"`
    );
  }

  // ── Step 4: Consume token (one-time use) ─────────────────────────────────
  await redis.del(uploadTokenKey(publicId));

  // ── Step 5: Build and return the permanent Cloudinary URL ────────────────
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/v${version}/${publicId}`;
}
