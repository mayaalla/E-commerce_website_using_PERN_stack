import { useMutation, useQueryClient } from "@tanstack/react-query";

import addCategory from "../api/addCategorie";
import type { addCategoryRequest, addCategoryResponse } from "../types";
import { categoriesQueryKey } from "./useGetCategories";

export function useAddCategory() {
  const queryClient = useQueryClient();

  return useMutation<addCategoryResponse, Error, addCategoryRequest>({
    mutationFn: addCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}
