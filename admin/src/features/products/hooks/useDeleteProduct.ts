import { useMutation, useQueryClient } from "@tanstack/react-query";

import deleteProduct from "../api/deleteProduct";
import type { DeleteProductResponse } from "../types";
import { productQueryKey } from "./useGetProduct";

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation<DeleteProductResponse, Error, number>({
    mutationFn: deleteProduct,
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.removeQueries({ queryKey: productQueryKey(id) });
    },
  });
}
