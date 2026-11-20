import { useMutation, useQueryClient } from "@tanstack/react-query";

import updateCommune from "../api/updateCommune";
import type { updateCommuneRequest, updateCommuneResponse } from "../types";
import { CommunesQueryKey } from "./useGetCommunes";
import { CommuneQueryKey } from "./useGetCommune";

interface UpdateCommuneVariables {
  id: number;
  data: updateCommuneRequest;
}

export function useUpdateCommune() {
  const queryClient = useQueryClient();

  return useMutation<updateCommuneResponse, Error, UpdateCommuneVariables>({
    mutationFn: ({ id, data }) => updateCommune(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: CommunesQueryKey });
      queryClient.invalidateQueries({ queryKey: CommuneQueryKey(id) });
    },
  });
}
