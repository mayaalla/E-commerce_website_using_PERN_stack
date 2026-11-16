import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import addAdmin from "../api/addAdmin";

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

const INITIAL_FORM = {
	username: "",
	password: "",
	phoneNumber: "",
	type: "regular_admin",
	permissions: [],
};

function AddAdminPanel() {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(INITIAL_FORM);
	const [errors, setErrors] = useState({});
	const queryClient = useQueryClient();
	const { mutate, isPending } = useMutation({
		mutationFn: addAdmin,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admins"] });
			setOpen(false);
			setForm(INITIAL_FORM);
			setErrors({});
		},
		onError: (error) => setErrors((previous) => ({ ...previous, form: error.message })),
	});

	function handleOpenChange(nextOpen) {
		setOpen(nextOpen);
		if (!nextOpen) {
			setForm(INITIAL_FORM);
			setErrors({});
		}
	}

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

	function validate() {
		const nextErrors = {};
		if (form.username.length < 3 || form.username.length > 50 || /\s/.test(form.username)) {
			nextErrors.username = "Username must be 3–50 characters with no spaces.";
		}
		if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
			nextErrors.password = "Use at least 8 characters, including an uppercase letter and a number.";
		}
		if (!/^0\d{9}$/.test(form.phoneNumber)) {
			nextErrors.phoneNumber = "Phone number must be 10 digits and start with 0.";
		}
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}

	function handleSubmit(event) {
		event.preventDefault();
		if (!validate()) return;
		mutate({ ...form, username: form.username.trim() });
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button className="gap-1.5 shrink-0" aria-label="Open add admin dialog">
					<Plus className="size-4" aria-hidden="true" />
					Add Admin
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add Admin</DialogTitle>
					<DialogDescription>Create an admin account and choose its permissions.</DialogDescription>
				</DialogHeader>

				<form id="add-admin-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 py-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="aa-username">Username <span className="text-destructive">*</span></Label>
						<Input id="aa-username" value={form.username} onChange={(event) => setField("username", event.target.value)} disabled={isPending} autoComplete="off" maxLength={50} aria-invalid={!!errors.username} />
						{errors.username && <p role="alert" className="text-xs text-destructive">{errors.username}</p>}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="aa-password">Password <span className="text-destructive">*</span></Label>
						<Input id="aa-password" type="password" value={form.password} onChange={(event) => setField("password", event.target.value)} disabled={isPending} autoComplete="new-password" aria-invalid={!!errors.password} />
						{errors.password && <p role="alert" className="text-xs text-destructive">{errors.password}</p>}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="aa-phone">Phone number <span className="text-destructive">*</span></Label>
						<Input id="aa-phone" type="tel" inputMode="numeric" value={form.phoneNumber} onChange={(event) => setField("phoneNumber", event.target.value)} disabled={isPending} maxLength={10} autoComplete="tel" aria-invalid={!!errors.phoneNumber} />
						{errors.phoneNumber && <p role="alert" className="text-xs text-destructive">{errors.phoneNumber}</p>}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="aa-type">Admin type</Label>
						<Select value={form.type} onValueChange={(value) => setField("type", value)} disabled={isPending}>
							<SelectTrigger id="aa-type" className="w-full"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="regular_admin">Regular admin</SelectItem>
								<SelectItem value="super_admin">Super admin</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<fieldset disabled={isPending} className="flex flex-col gap-2">
						<legend className="text-sm font-medium">Permissions <span className="text-xs font-normal text-muted-foreground">(optional)</span></legend>
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
					<Button type="submit" form="add-admin-form" disabled={isPending} className="gap-1.5">
						{isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
						{isPending ? "Creating…" : "Add Admin"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default AddAdminPanel;
