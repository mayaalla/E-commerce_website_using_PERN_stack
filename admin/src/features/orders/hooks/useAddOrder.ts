import { useMutation, useQueryClient } from "@tanstack/react-query";

import addOrder from "../api/addOrder";
import type { CreateOrderRequest, CreateOrderResponse } from "../types";

export function useAddOrder() {
  const queryClient = useQueryClient();

  return useMutation<CreateOrderResponse, Error, CreateOrderRequest>({
    mutationFn: addOrder,
    onSuccess: async (_response, variables) => {
      const stockInvalidations = Array.from(
        new Set(variables.products.map((item) => item.productId)),
        (productId) =>
          queryClient.invalidateQueries({
            queryKey: ["products", productId, "stock"],
          }),
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        ...stockInvalidations,
      ]);
    },
  });
}
