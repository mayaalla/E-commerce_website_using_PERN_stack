import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { DeleteShippingCompanyResponse } from "../types";

const deleteShippingCompany = async (
  id: number
): Promise<DeleteShippingCompanyResponse> => {
  try {
    const response = await apiClient.delete<DeleteShippingCompanyResponse>(
      `/shipping/companies/${id}`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while deleting the shipping company.";
        throw new Error(
          `Delete shipping company failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while deleting the shipping company.");
    }
    throw new Error("An unexpected error occurred while deleting the shipping company.");
  }
};

export default deleteShippingCompany;
