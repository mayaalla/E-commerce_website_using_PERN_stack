import type { NextFunction, Request, Response } from "express";
import { requestUploadTokensService } from "../service/upload.service.js";

// ── requestUploadTokens ──────────────────────────────────────────────────────
// POST /api/products/upload/request-tokens
// Generates signed Cloudinary upload tokens for a set of files.
// Auth + rate-limit middleware are applied at the router level.
// req.admin is guaranteed to be set by the authenticate middleware that runs
// before this controller — so the non-null assertion is safe here.

export async function requestUploadTokens(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // req.admin is attached by authenticate middleware (runs before this handler)
    const adminId = req.admin!.id;
    const tokens = await requestUploadTokensService(req.body.files, adminId);
    res.status(200).json({ success: true, data: tokens });
  } catch (error) {
    next(error);
  }
}
