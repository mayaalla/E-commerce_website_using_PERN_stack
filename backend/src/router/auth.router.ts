import { Router } from "express";
import { login, logout, refreshToken, getMe } from "../controller/auth.controller.js";
import { authenticate } from "../middleware/authentication.js";
import { validateAdminLogin } from "../middleware/validation.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body validated by validateAdminLogin before reaching the controller.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", validateAdminLogin, login);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Requires an authenticated admin before the logout controller runs.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/logout", authenticate, logout);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh-token
// Reads the refresh token from the HTTP-only cookie set at login.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/refresh-token", refreshToken);


router.get("/me", authenticate, getMe);

export default router;
