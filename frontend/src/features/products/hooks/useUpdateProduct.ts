import { useMutation, useQueryClient } from "@tanstack/react-query";

import updateProduct from "../api/updateProduct";
import type { UpdateProductRequest, UpdateProductResponse } from "../types";
import { productsQueryKey } from "./useGetProducts";
import { productQueryKey } from "./useGetProduct";

interface UpdateProductVariables {
  id: number;
  data: UpdateProductRequest;
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation<UpdateProductResponse, Error, UpdateProductVariables>({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
      queryClient.invalidateQueries({ queryKey: productQueryKey(id) });
    },
  });
}
