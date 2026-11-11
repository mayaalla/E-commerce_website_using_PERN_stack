import { useMutation, useQueryClient } from "@tanstack/react-query";

import addWilaya from "../api/addWilaya";
import type { addWilayaRequest, addWilayaResponse } from "../types";
import { WilayasQueryKey } from "./useGetWilayas";

export function useAddWilaya() {
  const queryClient = useQueryClient();

  return useMutation<addWilayaResponse, Error, addWilayaRequest>({
    mutationFn: addWilaya,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WilayasQueryKey });
    },
  });
}
