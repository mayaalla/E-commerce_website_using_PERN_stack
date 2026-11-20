import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { UpdateShippingPriceRequest, UpdateShippingPriceResponse } from "../types";

const updateShippingPrice = async (
  id: number,
  data: UpdateShippingPriceRequest
): Promise<UpdateShippingPriceResponse> => {
  try {
    const response = await apiClient.put<UpdateShippingPriceResponse>(
      `/shipping/prices/${id}`,
      data
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while updating the shipping price.";
        throw new Error(
          `Update shipping price failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while updating the shipping price.");
    }
    throw new Error("An unexpected error occurred while updating the shipping price.");
  }
};

export default updateShippingPrice;
