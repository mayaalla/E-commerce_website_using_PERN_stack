import { useMutation, useQueryClient } from "@tanstack/react-query";

import addProduct from "../api/addProduct";
import type { CreateProductRequest, CreateProductResponse } from "../types";
import { productsQueryKey } from "./useGetProducts";

export function useAddProduct() {
  const queryClient = useQueryClient();

  return useMutation<CreateProductResponse, Error, CreateProductRequest>({
    mutationFn: addProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
    },
  });
}
