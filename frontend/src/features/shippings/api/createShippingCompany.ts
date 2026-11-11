import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { CreateShippingCompanyRequest, CreateShippingCompanyResponse } from "../types";

const createShippingCompany = async (
  data: CreateShippingCompanyRequest
): Promise<CreateShippingCompanyResponse> => {
  try {
    const response = await apiClient.post<CreateShippingCompanyResponse>(
      "/shipping/companies",
      data
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while creating the shipping company.";
        throw new Error(
          `Create shipping company failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while creating the shipping company.");
    }
    throw new Error("An unexpected error occurred while creating the shipping company.");
  }
};

export default createShippingCompany;
