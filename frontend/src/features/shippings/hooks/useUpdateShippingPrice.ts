import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateShippingPrice from "../api/updateShippingPrice";
import type { UpdateShippingPriceRequest, UpdateShippingPriceResponse } from "../types";
import { shippingPricesQueryKey } from "./useGetShippingPrices";
import { shippingPriceQueryKey } from "./useGetShippingPrice";

interface UpdateShippingPriceVariables {
  id: number;
  data: UpdateShippingPriceRequest;
}

export function useUpdateShippingPrice() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateShippingPriceResponse,
    Error,
    UpdateShippingPriceVariables
  >({
    mutationFn: ({ id, data }) => updateShippingPrice(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: shippingPricesQueryKey });
      queryClient.invalidateQueries({ queryKey: shippingPriceQueryKey(id) });
    },
  });
}
