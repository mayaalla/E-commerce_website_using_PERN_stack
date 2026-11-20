import { useQuery } from "@tanstack/react-query";
import getAllAdmins from "../api/getAdmins";

export const adminsQueryKey = ["admins"] as const;

export function useGetAdmins() {
    const query = useQuery({
        queryKey: adminsQueryKey,
        queryFn: getAllAdmins,
    });

    return {
        ...query,
        admins: query.data?.data ?? [],
    };
}
