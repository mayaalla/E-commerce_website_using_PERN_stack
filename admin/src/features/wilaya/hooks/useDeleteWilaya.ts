import { useMutation, useQueryClient } from "@tanstack/react-query";

import deleteWilaya from "../api/deleteWilaya";
import type { deleteWilayaResponse } from "../types";
import { WilayasQueryKey } from "./useGetWilayas";
import { WilayaQueryKey } from "./useGetWilaya";

export function useDeleteWilaya() {
  const queryClient = useQueryClient();

  return useMutation<deleteWilayaResponse, Error, number>({
    mutationFn: deleteWilaya,
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: WilayasQueryKey });
      queryClient.removeQueries({ queryKey: WilayaQueryKey(id) });
    },
  });
}
