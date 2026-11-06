import { useMutation, useQueryClient } from "@tanstack/react-query";

import deleteCategory from "../api/deleteCategory";
import type { deleteCategoryResponse } from "../types";
import { categoriesQueryKey } from "./useGetCategories";
import { categoryQueryKey } from "./useGetCategory";

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation<deleteCategoryResponse, Error, number>({
    mutationFn: deleteCategory,
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      queryClient.removeQueries({ queryKey: categoryQueryKey(id) });
    },
  });
}
