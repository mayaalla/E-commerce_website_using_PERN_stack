import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { GetCouponsResponse } from "../types";

const getCoupons = async (): Promise<GetCouponsResponse> => {
  try {
    const response = await apiClient.get<GetCouponsResponse>("/coupons");
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while fetching coupons.";
        throw new Error(
          `Get coupons failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while fetching coupons.");
    }
    throw new Error("An unexpected error occurred while fetching coupons.");
  }
};

export default getCoupons;
