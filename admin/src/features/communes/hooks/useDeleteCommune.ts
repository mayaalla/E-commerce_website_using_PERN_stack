import { useMutation, useQueryClient } from "@tanstack/react-query";

import deleteCommune from "../api/deleteCommune";
import type { deleteCommuneResponse } from "../types";
import { CommunesQueryKey } from "./useGetCommunes";
import { CommuneQueryKey } from "./useGetCommune";

export function useDeleteCommune() {
  const queryClient = useQueryClient();

  return useMutation<deleteCommuneResponse, Error, number>({
    mutationFn: deleteCommune,
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: CommunesQueryKey });
      queryClient.removeQueries({ queryKey: CommuneQueryKey(id) });
    },
  });
}
