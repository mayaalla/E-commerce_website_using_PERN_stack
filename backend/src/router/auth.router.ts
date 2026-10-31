import { Router } from "express";
import { login, logout, refreshToken } from "../controller/auth.controller.js";
import { validateAdminLogin } from "../middleware/validation.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body validated by validateAdminLogin before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", validateAdminLogin, login);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Requires the authenticate middleware (to be added once implemented).
// ─────────────────────────────────────────────────────────────────────────────
router.post("/logout", logout);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh-token
// Reads the refresh token from the HTTP-only cookie set at login.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/refresh-token", refreshToken);

export default router;
