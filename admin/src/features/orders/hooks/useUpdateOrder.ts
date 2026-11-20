import { useMutation, useQueryClient } from "@tanstack/react-query";

import updateOrder, { updateOrderInfo } from "../api/updateOrder";
import type {
  UpdateOrderInfoRequest,
  UpdateOrderInfoResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
} from "../types";
import { orderQueryKey } from "./useGetOrder";

interface UpdateOrderStatusVariables {
  id: number;
  data: UpdateOrderStatusRequest;
}

interface UpdateOrderInfoVariables {
  id: number;
  data: UpdateOrderInfoRequest;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation<UpdateOrderStatusResponse, Error, UpdateOrderStatusVariables>({
    mutationFn: ({ id, data }) => updateOrder(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: orderQueryKey(id) });
    },
  });
}

export function useUpdateOrderInfo() {
  const queryClient = useQueryClient();

  return useMutation<UpdateOrderInfoResponse, Error, UpdateOrderInfoVariables>({
    mutationFn: ({ id, data }) => updateOrderInfo(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: orderQueryKey(id) });
    },
  });
}
