import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import deleteAdmin from "../api/deleteAdmin";
import updateAdmin from "../api/updateAdmin";

const ADMIN_PERMISSIONS = [
	"product_read", "product_add", "product_update", "product_delete",
	"category_read", "category_add", "category_update", "category_delete",
	"order_read", "order_add", "order_update", "order_delete",
	"coupon_read", "coupon_add", "coupon_update", "coupon_delete",
	"shipping_read", "shipping_add", "shipping_update", "shipping_delete",
	"shipping_company_read", "shipping_company_add", "shipping_company_update",
	"shipping_company_delete", "full_access",
];

function getPermissionLabel(permission) {
	if (permission === "full_access") return "Full Access";

	const separatorIndex = permission.lastIndexOf("_");
	const action = permission.slice(separatorIndex + 1);
	const resource = permission
		.slice(0, separatorIndex)
		.split("_")
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(" ");
	const actionLabel = { read: "Read", add: "Add", update: "Update", delete: "Delete" }[action] ?? action;

	return `${actionLabel} ${resource}`;
}

function buildAdminForm(admin) {
	return {
		username: admin.username,
		phoneNumber: admin.phoneNumber,
		password: "",
		type: admin.type,
		permissions: [...admin.permissions],
	};
}

function EditAdminDialog({ admin, open, onOpenChange }) {
	const [form, setForm] = useState(() => buildAdminForm(admin));
	const [errors, setErrors] = useState({});
	const queryClient = useQueryClient();
	const { mutate, isPending } = useMutation({
		mutationFn: ({ id, data }) => updateAdmin(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admins"] });
			onOpenChange(false);
		},
		onError: (error) => setErrors((previous) => ({ ...previous, form: error.message })),
	});

	useEffect(() => {
		if (open) {
			setForm(buildAdminForm(admin));
			setErrors({});
		}
	}, [open, admin]);

	function setField(field, value) {
		setForm((previous) => ({ ...previous, [field]: value }));
		setErrors((previous) => ({ ...previous, [field]: "", form: "" }));
	}

	function togglePermission(permission) {
		setForm((previous) => ({
			...previous,
			permissions: previous.permissions.includes(permission)
				? previous.permissions.filter((item) => item !== permission)
				: [...previous.permissions, permission],
		}));
	}

	function handleSubmit(event) {
		event.preventDefault();
		const nextErrors = {};
		if (form.username.length < 3 || form.username.length > 50 || /\s/.test(form.username)) {
			nextErrors.username = "Username must be 3–50 characters with no spaces.";
		}
		if (form.phoneNumber !== admin.phoneNumber && !/^0\d{9}$/.test(form.phoneNumber)) {
			nextErrors.phoneNumber = "Phone number must be 10 digits and start with 0.";
		}
		if (form.password && (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password))) {
			nextErrors.password = "Use at least 8 characters, including an uppercase letter and a number.";
		}
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length) return;

		const data = {};
		const username = form.username.trim();
		if (username !== admin.username) data.username = username;
		if (form.phoneNumber !== admin.phoneNumber) data.phoneNumber = form.phoneNumber;
		if (form.password) data.password = form.password;
		if (form.type !== admin.type) data.type = form.type;
		if (JSON.stringify(form.permissions) !== JSON.stringify(admin.permissions)) data.permissions = form.permissions;
		if (Object.keys(data).length === 0) {
			onOpenChange(false);
			return;
		}
		mutate({ id: admin.id, data });
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Admin</DialogTitle>
					<DialogDescription>Update {admin.username}’s account details and permissions.</DialogDescription>
				</DialogHeader>
				<form id={`edit-admin-form-${admin.id}`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 py-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor={`ea-username-${admin.id}`}>Username <span className="text-destructive">*</span></Label>
						<Input id={`ea-username-${admin.id}`} value={form.username} onChange={(event) => setField("username", event.target.value)} disabled={isPending} maxLength={50} autoComplete="off" aria-invalid={!!errors.username} />
						{errors.username && <p role="alert" className="text-xs text-destructive">{errors.username}</p>}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor={`ea-phone-${admin.id}`}>Phone number</Label>
						<Input id={`ea-phone-${admin.id}`} type="tel" inputMode="numeric" value={form.phoneNumber} onChange={(event) => setField("phoneNumber", event.target.value)} disabled={isPending} maxLength={10} aria-invalid={!!errors.phoneNumber} />
						{errors.phoneNumber && <p role="alert" className="text-xs text-destructive">{errors.phoneNumber}</p>}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor={`ea-password-${admin.id}`}>New password <span className="text-xs font-normal text-muted-foreground">(leave blank to keep current)</span></Label>
						<Input id={`ea-password-${admin.id}`} type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} disabled={isPending} autoComplete="new-password" aria-invalid={!!errors.password} />
						{errors.password && <p role="alert" className="text-xs text-destructive">{errors.password}</p>}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor={`ea-type-${admin.id}`}>Admin type</Label>
						<Select value={form.type} onValueChange={(value) => setField("type", value)} disabled={isPending}>
							<SelectTrigger id={`ea-type-${admin.id}`} className="w-full"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="regular_admin">Regular admin</SelectItem>
								<SelectItem value="super_admin">Super admin</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<fieldset disabled={isPending} className="flex flex-col gap-2">
						<legend className="text-sm font-medium">Permissions</legend>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border border-border p-3 max-h-48 overflow-y-auto">
							{ADMIN_PERMISSIONS.map((permission) => (
								<label key={permission} className="flex items-center gap-2 text-xs cursor-pointer">
									<input type="checkbox" checked={form.permissions.includes(permission)} onChange={() => togglePermission(permission)} className="accent-primary" />
									<span>{getPermissionLabel(permission)}</span>
								</label>
							))}
						</div>
					</fieldset>
					{errors.form && <p role="alert" className="text-xs text-destructive">{errors.form}</p>}
				</form>
				<DialogFooter className="gap-2 pt-2">
					<DialogClose asChild><Button type="button" variant="outline" disabled={isPending}>Cancel</Button></DialogClose>
					<Button type="submit" form={`edit-admin-form-${admin.id}`} disabled={isPending} className="gap-1.5">
						{isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
						{isPending ? "Saving…" : "Save Changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function AdminRow({ admin }) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const queryClient = useQueryClient();
	const { mutate: remove, isPending: isDeleting } = useMutation({
		mutationFn: () => deleteAdmin(admin.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admins"] });
			setDeleteOpen(false);
		},
		onError: (error) => setDeleteError(error.message),
	});

	return (
		<TableRow>
			<TableCell className="w-16 pl-6 text-muted-foreground font-mono text-xs select-none">#{admin.id}</TableCell>
			<TableCell className="font-medium">{admin.username}</TableCell>
			<TableCell className="whitespace-nowrap">{admin.phoneNumber}</TableCell>
			<TableCell><Badge variant={admin.type === "super_admin" ? "default" : "secondary"}>{admin.type === "super_admin" ? "Super admin" : "Regular admin"}</Badge></TableCell>
			<TableCell className="max-w-[360px]">
				<div className="flex flex-wrap gap-1">
					{admin.permissions.length > 0 ? admin.permissions.map((permission) => <Badge key={permission} variant="outline" className="text-xs">{getPermissionLabel(permission)}</Badge>) : <span className="text-xs text-muted-foreground">No permissions</span>}
				</div>
			</TableCell>
			<TableCell className="w-24 pr-6 text-right">
				<div className="flex items-center justify-end gap-1">
					<Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} disabled={isDeleting} aria-label={`Edit admin ${admin.username}`} title="Edit" className="text-muted-foreground hover:text-foreground">
						<Pencil className="size-4" aria-hidden="true" />
					</Button>
					<Button variant="ghost" size="icon-sm" onClick={() => { setDeleteError(""); setDeleteOpen(true); }} disabled={isDeleting} aria-label={`Delete admin ${admin.username}`} title={isDeleting ? "Deleting…" : "Delete"} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
						{isDeleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
					</Button>
				</div>
				<EditAdminDialog admin={admin} open={editOpen} onOpenChange={setEditOpen} />
				<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete admin?</AlertDialogTitle>
							<AlertDialogDescription>This permanently deletes {admin.username}’s admin account.</AlertDialogDescription>
						</AlertDialogHeader>
						{deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
							<AlertDialogAction variant="destructive" disabled={isDeleting} onClick={(event) => { event.preventDefault(); remove(); }}>
								{isDeleting && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
								Delete admin
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</TableCell>
		</TableRow>
	);
}

function AdminTable({ admins }) {
	if (!admins || admins.length === 0) {
		return (
			<div className="border-t border-dashed border-border bg-muted/20 py-16 text-center">
				<p className="text-sm text-muted-foreground">No admins yet. Add one above to get started.</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent border-b bg-muted/50">
						<TableHead className="w-16 pl-6 text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
						<TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Username</TableHead>
						<TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Phone</TableHead>
						<TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Type</TableHead>
						<TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Permissions</TableHead>
						<TableHead className="w-24 pr-6 text-right text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>{admins.map((admin) => <AdminRow key={admin.id} admin={admin} />)}</TableBody>
			</Table>
		</div>
	);
}

export default AdminTable;
