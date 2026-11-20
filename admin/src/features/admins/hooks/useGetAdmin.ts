import { useQuery } from "@tanstack/react-query";
import getAdmin from "../api/getAdmin";

export function useGetAdmin(id: number) {
    const query = useQuery({
        queryKey: ["admins", id],
        queryFn: () => getAdmin(id),
        enabled: !!id,
    });

    return {
        ...query,
        admin: query.data?.data ?? null,
    };
}
