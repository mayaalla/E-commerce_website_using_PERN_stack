import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { GetShippingPricesResponse } from "../types";

const getShippingPrices = async (): Promise<GetShippingPricesResponse> => {
  try {
    const response = await apiClient.get<GetShippingPricesResponse>(
      "/shipping/prices"
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while fetching shipping prices.";
        throw new Error(
          `Get shipping prices failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while fetching shipping prices.");
    }
    throw new Error("An unexpected error occurred while fetching shipping prices.");
  }
};

export default getShippingPrices;
