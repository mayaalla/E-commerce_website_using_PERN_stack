import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { GetShippingPriceResponse } from "../types";

const getShippingPrice = async (id: number): Promise<GetShippingPriceResponse> => {
  try {
    const response = await apiClient.get<GetShippingPriceResponse>(
      `/shipping/prices/${id}`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while fetching the shipping price.";
        throw new Error(
          `Get shipping price failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while fetching the shipping price.");
    }
    throw new Error("An unexpected error occurred while fetching the shipping price.");
  }
};

export default getShippingPrice;
