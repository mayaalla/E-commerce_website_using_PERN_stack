import { useQuery } from "@tanstack/react-query";
import { me } from "../api/me";

export function useCurrentAdmin() {
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: me,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    ...query,
    admin: query.data?.data ?? null,
  };
}
