import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { UpdateShippingCompanyRequest, UpdateShippingCompanyResponse } from "../types";

const updateShippingCompany = async (
  id: number,
  data: UpdateShippingCompanyRequest
): Promise<UpdateShippingCompanyResponse> => {
  try {
    const response = await apiClient.put<UpdateShippingCompanyResponse>(
      `/shipping/companies/${id}`,
      data
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while updating the shipping company.";
        throw new Error(
          `Update shipping company failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while updating the shipping company.");
    }
    throw new Error("An unexpected error occurred while updating the shipping company.");
  }
};

export default updateShippingCompany;
