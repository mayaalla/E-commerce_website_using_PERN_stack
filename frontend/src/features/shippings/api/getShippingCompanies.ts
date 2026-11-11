import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { GetShippingCompaniesResponse } from "../types";

const getShippingCompanies = async (): Promise<GetShippingCompaniesResponse> => {
  try {
    const response = await apiClient.get<GetShippingCompaniesResponse>(
      "/shipping/companies"
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while fetching shipping companies.";
        throw new Error(
          `Get shipping companies failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while fetching shipping companies.");
    }
    throw new Error("An unexpected error occurred while fetching shipping companies.");
  }
};

export default getShippingCompanies;
