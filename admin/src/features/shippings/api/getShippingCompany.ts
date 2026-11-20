import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { GetShippingCompanyResponse } from "../types";

const getShippingCompany = async (id: number): Promise<GetShippingCompanyResponse> => {
  try {
    const response = await apiClient.get<GetShippingCompanyResponse>(
      `/shipping/companies/${id}`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while fetching the shipping company.";
        throw new Error(
          `Get shipping company failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while fetching the shipping company.");
    }
    throw new Error("An unexpected error occurred while fetching the shipping company.");
  }
};

export default getShippingCompany;
