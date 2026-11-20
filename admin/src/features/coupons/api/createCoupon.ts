import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { CreateCouponRequest, CreateCouponResponse } from "../types";

const createCoupon = async (
  data: CreateCouponRequest
): Promise<CreateCouponResponse> => {
  try {
    const response = await apiClient.post<CreateCouponResponse>(
      "/coupons",
      data
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while creating the coupon.";
        throw new Error(
          `Create coupon failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while creating the coupon.");
    }
    throw new Error("An unexpected error occurred while creating the coupon.");
  }
};

export default createCoupon;
