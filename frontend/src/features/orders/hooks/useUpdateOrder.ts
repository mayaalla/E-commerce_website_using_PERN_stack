import { useMutation, useQueryClient } from "@tanstack/react-query";

import updateOrder from "../api/updateOrder";
import type { UpdateOrderStatusRequest, UpdateOrderStatusResponse } from "../types";
import { ordersQueryKey } from "./useGetOrders";
import { orderQueryKey } from "./useGetOrder";

interface UpdateOrderStatusVariables {
  id: number;
  data: UpdateOrderStatusRequest;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation<UpdateOrderStatusResponse, Error, UpdateOrderStatusVariables>({
    mutationFn: ({ id, data }) => updateOrder(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      queryClient.invalidateQueries({ queryKey: orderQueryKey(id) });
    },
  });
}
