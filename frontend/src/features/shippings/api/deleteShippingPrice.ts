import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { DeleteShippingPriceResponse } from "../types";

const deleteShippingPrice = async (id: number): Promise<DeleteShippingPriceResponse> => {
  try {
    const response = await apiClient.delete<DeleteShippingPriceResponse>(
      `/shipping/prices/${id}`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while deleting the shipping price.";
        throw new Error(
          `Delete shipping price failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while deleting the shipping price.");
    }
    throw new Error("An unexpected error occurred while deleting the shipping price.");
  }
};

export default deleteShippingPrice;
