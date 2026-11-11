import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteShippingCompany from "../api/deleteShippingCompany";
import type { DeleteShippingCompanyResponse } from "../types";
import { shippingCompaniesQueryKey } from "./useGetShippingCompanies";
import { shippingCompanyQueryKey } from "./useGetShippingCompany";

export function useDeleteShippingCompany() {
  const queryClient = useQueryClient();

  return useMutation<DeleteShippingCompanyResponse, Error, number>({
    mutationFn: deleteShippingCompany,
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: shippingCompaniesQueryKey });
      queryClient.removeQueries({ queryKey: shippingCompanyQueryKey(id) });
    },
  });
}
