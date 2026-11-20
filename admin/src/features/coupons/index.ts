// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useCreateCoupon } from "./hooks/useCreateCoupon";
export { useGetCoupons } from "./hooks/useGetCoupons";
export { useGetCoupon } from "./hooks/useGetCoupon";
export { useUpdateCoupon } from "./hooks/useUpdateCoupon";
export { useDeleteCoupon } from "./hooks/useDeleteCoupon";
export { useValidateCoupon } from "./hooks/useValidateCoupon";

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  CouponStatus,
  Coupon,
  CreateCouponRequest,
  CreateCouponResponse,
  GetCouponsResponse,
  GetCouponResponse,
  UpdateCouponRequest,
  UpdateCouponResponse,
  DeleteCouponResponse,
  ValidateCouponResponse,
} from "./types";
