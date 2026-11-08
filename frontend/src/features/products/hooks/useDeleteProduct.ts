import { useMutation, useQueryClient } from "@tanstack/react-query";

import deleteProduct from "../api/deleteProduct";
import type { DeleteProductResponse } from "../types";
import { productsQueryKey } from "./useGetProducts";
import { productQueryKey } from "./useGetProduct";

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation<DeleteProductResponse, Error, number>({
    mutationFn: deleteProduct,
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.removeQueries({ queryKey: productQueryKey(id) });
    },
  });
}
