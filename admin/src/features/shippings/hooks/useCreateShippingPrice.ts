import { useMutation, useQueryClient } from "@tanstack/react-query";
import createShippingPrice from "../api/createShippingPrice";
import type { CreateShippingPriceRequest, CreateShippingPriceResponse } from "../types";
import { shippingPricesQueryKey } from "./useGetShippingPrices";

export function useCreateShippingPrice() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateShippingPriceResponse,
    Error,
    CreateShippingPriceRequest
  >({
    mutationFn: createShippingPrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingPricesQueryKey });
    },
  });
}
