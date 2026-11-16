import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AddAdminPanel from "./AddAdminPanel";
import AdminTable from "./AdminTable";
import getAllAdmins from "../api/getAdmins";

export const adminsQueryKey = ["admins"];

function AdminPanel() {
	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: adminsQueryKey,
		queryFn: getAllAdmins,
	});
	const admins = data?.data ?? [];

	if (isLoading) {
		return (
			<Card className="gap-0 py-0 overflow-hidden">
				<div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
					<div className="h-9 w-48 rounded-md bg-muted animate-pulse" />
					<div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
				</div>
				{[...Array(5)].map((_, index) => (
					<div key={index} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0">
						<div className="h-4 w-10 rounded bg-muted animate-pulse" />
						<div className="h-4 w-40 rounded bg-muted animate-pulse" />
						<div className="h-4 w-32 rounded bg-muted animate-pulse" />
						<div className="h-4 w-24 rounded bg-muted animate-pulse" />
					</div>
				))}
			</Card>
		);
	}

	if (isError) {
		return (
			<Card className="py-5">
				<CardContent>
					<div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm">
						<AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
						<div className="flex flex-col gap-1">
							<p className="font-medium text-destructive">Failed to load admins</p>
							<p className="text-muted-foreground">{error?.message ?? "An unexpected error occurred."}</p>
							<button onClick={() => refetch()} className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline self-start">Try again</button>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="gap-0 py-0 overflow-hidden">
			<CardHeader className="border-b border-border px-6 py-4 gap-4">
				<div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<CardTitle className="text-sm font-semibold">All Admins</CardTitle>
						<CardDescription className="text-xs mt-0.5">
							{admins.length === 0 ? "No admins yet" : `${admins.length} ${admins.length === 1 ? "admin" : "admins"} total`}
						</CardDescription>
					</div>
					<AddAdminPanel />
				</div>
			</CardHeader>
			<CardContent className="p-0"><AdminTable admins={admins} /></CardContent>
		</Card>
	);
}

export default AdminPanel;
