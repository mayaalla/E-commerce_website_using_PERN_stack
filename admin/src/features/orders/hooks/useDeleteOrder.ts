import { useMutation, useQueryClient } from "@tanstack/react-query";

import deleteOrder from "../api/deleteOrder";
import type { DeleteOrderResponse } from "../types";
import { orderQueryKey } from "./useGetOrder";

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation<DeleteOrderResponse, Error, number>({
    mutationFn: deleteOrder,
    onSuccess: async (response, id) => {
      const order = response.data;
      const stockInvalidations =
        order.status === "pending" || order.status === "confirmed"
          ? Array.from(
              new Set(order.products.map((item) => item.productId)),
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
      queryClient.removeQueries({ queryKey: orderQueryKey(id) });
    },
  });
}
