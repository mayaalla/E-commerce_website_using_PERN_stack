import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteShippingPrice from "../api/deleteShippingPrice";
import type { DeleteShippingPriceResponse } from "../types";
import { shippingPricesQueryKey } from "./useGetShippingPrices";
import { shippingPriceQueryKey } from "./useGetShippingPrice";

export function useDeleteShippingPrice() {
  const queryClient = useQueryClient();

  return useMutation<DeleteShippingPriceResponse, Error, number>({
    mutationFn: deleteShippingPrice,
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: shippingPricesQueryKey });
      queryClient.removeQueries({ queryKey: shippingPriceQueryKey(id) });
    },
  });
}
