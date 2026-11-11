import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { GetShippingCompanyPricesResponse } from "../types";

const getShippingCompanyPrices = async (
  id: number
): Promise<GetShippingCompanyPricesResponse> => {
  try {
    const response = await apiClient.get<GetShippingCompanyPricesResponse>(
      `/shipping/companies/${id}/prices`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while fetching prices for the shipping company.";
        throw new Error(
          `Get shipping company prices failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while fetching shipping company prices.");
    }
    throw new Error("An unexpected error occurred while fetching shipping company prices.");
  }
};

export default getShippingCompanyPrices;
