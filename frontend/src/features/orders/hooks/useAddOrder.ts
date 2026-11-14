import { useMutation, useQueryClient } from "@tanstack/react-query";

import addOrder from "../api/addOrder";
import type { CreateOrderRequest, CreateOrderResponse } from "../types";
import { ordersQueryKey } from "./useGetOrders";

export function useAddOrder() {
  const queryClient = useQueryClient();

  return useMutation<CreateOrderResponse, Error, CreateOrderRequest>({
    mutationFn: addOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKey });
    },
  });
}
