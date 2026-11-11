import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { CreateShippingPriceRequest, CreateShippingPriceResponse } from "../types";

const createShippingPrice = async (
  data: CreateShippingPriceRequest
): Promise<CreateShippingPriceResponse> => {
  try {
    const response = await apiClient.post<CreateShippingPriceResponse>(
      "/shipping/prices",
      data
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while creating the shipping price.";
        throw new Error(
          `Create shipping price failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while creating the shipping price.");
    }
    throw new Error("An unexpected error occurred while creating the shipping price.");
  }
};

export default createShippingPrice;
