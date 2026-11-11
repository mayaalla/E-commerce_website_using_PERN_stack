import { useMutation, useQueryClient } from "@tanstack/react-query";

import addCommune from "../api/addCommune";
import type { addCommuneRequest, addCommuneResponse } from "../types";
import { CommunesQueryKey } from "./useGetCommunes";

export function useAddCommune() {
  const queryClient = useQueryClient();

  return useMutation<addCommuneResponse, Error, addCommuneRequest>({
    mutationFn: addCommune,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CommunesQueryKey });
    },
  });
}
