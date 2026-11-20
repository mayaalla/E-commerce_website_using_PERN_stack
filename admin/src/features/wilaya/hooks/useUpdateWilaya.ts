import { useMutation, useQueryClient } from "@tanstack/react-query";

import updateWilaya from "../api/updateWilaya";
import type { updateWilayaRequest, updateWilayaResponse } from "../types";
import { WilayasQueryKey } from "./useGetWilayas";
import { WilayaQueryKey } from "./useGetWilaya";

interface UpdateWilayaVariables {
  id: number;
  data: updateWilayaRequest;
}

export function useUpdateWilaya() {
  const queryClient = useQueryClient();

  return useMutation<updateWilayaResponse, Error, UpdateWilayaVariables>({
    mutationFn: ({ id, data }) => updateWilaya(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: WilayasQueryKey });
      queryClient.invalidateQueries({ queryKey: WilayaQueryKey(id) });
    },
  });
}
