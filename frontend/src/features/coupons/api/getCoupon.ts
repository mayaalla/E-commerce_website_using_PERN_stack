import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { GetCouponResponse } from "../types";

const getCoupon = async (id: number): Promise<GetCouponResponse> => {
  try {
    const response = await apiClient.get<GetCouponResponse>(`/coupons/${id}`);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while fetching the coupon.";
        throw new Error(
          `Get coupon failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while fetching the coupon.");
    }
    throw new Error("An unexpected error occurred while fetching the coupon.");
  }
};

export default getCoupon;
