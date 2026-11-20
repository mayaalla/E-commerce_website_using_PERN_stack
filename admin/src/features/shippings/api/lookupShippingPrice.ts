import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { ShippingPriceLookupParams, ShippingPriceLookupResponse } from "../types";

const lookupShippingPrice = async (
  params: ShippingPriceLookupParams
): Promise<ShippingPriceLookupResponse> => {
  try {
    const response = await apiClient.get<ShippingPriceLookupResponse>(
      "/shipping/prices/lookup",
      { params }
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while looking up the shipping price.";
        throw new Error(
          `Shipping price lookup failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while looking up the shipping price.");
    }
    throw new Error("An unexpected error occurred while looking up the shipping price.");
  }
};

export default lookupShippingPrice;
