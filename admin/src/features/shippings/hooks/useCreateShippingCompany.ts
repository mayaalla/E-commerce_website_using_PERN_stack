import { useMutation, useQueryClient } from "@tanstack/react-query";
import createShippingCompany from "../api/createShippingCompany";
import type { CreateShippingCompanyRequest, CreateShippingCompanyResponse } from "../types";
import { shippingCompaniesQueryKey } from "./useGetShippingCompanies";

export function useCreateShippingCompany() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateShippingCompanyResponse,
    Error,
    CreateShippingCompanyRequest
  >({
    mutationFn: createShippingCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingCompaniesQueryKey });
    },
  });
}
