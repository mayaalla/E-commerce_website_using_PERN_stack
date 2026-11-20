import { useMutation, useQueryClient } from "@tanstack/react-query";

import deleteOrder from "../api/deleteOrder";
import type { DeleteOrderResponse } from "../types";
import { orderQueryKey } from "./useGetOrder";

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation<DeleteOrderResponse, Error, number>({
    mutationFn: deleteOrder,
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.removeQueries({ queryKey: orderQueryKey(id) });
    },
  });
}
