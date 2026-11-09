// ─── Coupon Status ────────────────────────────────────────────────────────────
export type CouponStatus = "active" | "inactive" | "expired";

// ─── Coupon shape (returned by the API) ──────────────────────────────────────
export interface Coupon {
  id: number;
  code: string;
  expireDate: string; // "YYYY-MM-DD"
  discountPercentage: number; // 1–100 integer
  status: CouponStatus;
}

// ─── POST /coupons ────────────────────────────────────────────────────────────
export interface CreateCouponRequest {
  code: string;
  expireDate: string;
  discountPercentage: number; // 1–100 integer
  status?: CouponStatus;
}

export interface CreateCouponResponse {
  success: boolean;
  data: Coupon;
}

// ─── GET /coupons ─────────────────────────────────────────────────────────────
export interface GetCouponsResponse {
  success: boolean;
  data: Coupon[];
}

// ─── GET /coupons/:id ─────────────────────────────────────────────────────────
export interface GetCouponResponse {
  success: boolean;
  data: Coupon;
}

// ─── PUT /coupons/:id ────────────────────────────────────────────────────────
export interface UpdateCouponRequest {
  code?: string;
  expireDate?: string;
  discountPercentage?: number; // 1–100 integer
  status?: CouponStatus;
}

export interface UpdateCouponResponse {
  success: boolean;
  data: Coupon;
}

// ─── DELETE /coupons/:id ──────────────────────────────────────────────────────
export interface DeleteCouponResponse {
  success: boolean;
  data: Coupon;
}

// ─── GET /coupons/validate/:code ─────────────────────────────────────────────
export interface ValidateCouponResponse {
  success: boolean;
  data: Coupon;
}
