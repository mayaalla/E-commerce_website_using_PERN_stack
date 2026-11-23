import { useMutation, useQueryClient } from "@tanstack/react-query";

import updateOrder, { updateOrderInfo } from "../api/updateOrder";
import type {
  UpdateOrderInfoRequest,
  UpdateOrderInfoResponse,
  UpdateOrderStatusRequest,
  UpdateOrderStatusResponse,
} from "../types";

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
    onSuccess: async (response, { data }) => {
      const stockInvalidations =
        data.status === "canceled" || data.status === "returned"
          ? Array.from(
              new Set(response.data.products.map((item) => item.productId)),
              (productId) =>
                queryClient.invalidateQueries({
                  queryKey: ["products", productId, "stock"],
                }),
            )
          : [];

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        ...stockInvalidations,
      ]);
    },
  });
}

export function useUpdateOrderInfo() {
  const queryClient = useQueryClient();

  return useMutation<UpdateOrderInfoResponse, Error, UpdateOrderInfoVariables>({
    mutationFn: ({ id, data }) => updateOrderInfo(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
