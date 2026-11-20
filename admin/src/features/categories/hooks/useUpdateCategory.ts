import { useMutation, useQueryClient } from "@tanstack/react-query";

import updateCategory from "../api/updateCategory";
import type { updateCategoryRequest, updateCategoryResponse } from "../types";
import { categoriesQueryKey } from "./useGetCategories";
import { categoryQueryKey } from "./useGetCategory";

interface UpdateCategoryVariables {
  id: number;
  data: updateCategoryRequest;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation<updateCategoryResponse, Error, UpdateCategoryVariables>({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      queryClient.invalidateQueries({ queryKey: categoryQueryKey(id) });
    },
  });
}
