import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateShippingCompany from "../api/updateShippingCompany";
import type { UpdateShippingCompanyRequest, UpdateShippingCompanyResponse } from "../types";
import { shippingCompaniesQueryKey } from "./useGetShippingCompanies";
import { shippingCompanyQueryKey } from "./useGetShippingCompany";

interface UpdateShippingCompanyVariables {
  id: number;
  data: UpdateShippingCompanyRequest;
}

export function useUpdateShippingCompany() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateShippingCompanyResponse,
    Error,
    UpdateShippingCompanyVariables
  >({
    mutationFn: ({ id, data }) => updateShippingCompany(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: shippingCompaniesQueryKey });
      queryClient.invalidateQueries({ queryKey: shippingCompanyQueryKey(id) });
    },
  });
}
