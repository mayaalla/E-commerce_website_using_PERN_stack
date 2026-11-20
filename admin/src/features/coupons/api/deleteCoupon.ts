import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { DeleteCouponResponse } from "../types";

const deleteCoupon = async (id: number): Promise<DeleteCouponResponse> => {
  try {
    const response = await apiClient.delete<DeleteCouponResponse>(
      `/coupons/${id}`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while deleting the coupon.";
        throw new Error(
          `Delete coupon failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while deleting the coupon.");
    }
    throw new Error("An unexpected error occurred while deleting the coupon.");
  }
};

export default deleteCoupon;
