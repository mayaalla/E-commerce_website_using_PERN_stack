export type AdminType = "super_admin" | "regular_admin";

export type AdminPermission =
    | "product_read"
    | "product_add"
    | "product_update"
    | "product_delete"
    | "category_read"
    | "category_add"
    | "category_update"
    | "category_delete"
    | "order_read"
    | "order_add"
    | "order_update"
    | "order_delete"
    | "coupon_read"
    | "coupon_add"
    | "coupon_update"
    | "coupon_delete"
    | "shipping_read"
    | "shipping_add"
    | "shipping_update"
    | "shipping_delete"
    | "shipping_company_read"
    | "shipping_company_add"
    | "shipping_company_update"
    | "shipping_company_delete"
    | "full_access";

export interface Admin {
    id: number;
    username: string;
    phoneNumber: string;
    permissions: AdminPermission[];
    type: AdminType;
}

export interface addAdminRequest {
    username: string;
    password: string;
    phoneNumber: string;
    permissions?: AdminPermission[];
    type?: AdminType;
}

export interface updateAdminRequest {
    username?: string;
    password?: string;
    phoneNumber?: string;
    permissions?: AdminPermission[];
    type?: AdminType;
}

export interface addAdminResponse {
    success: boolean;
    data: Admin;
}

export interface updateAdminResponse {
    success: boolean;
    data: Admin;
}

export interface getAdminResponse {
    success: boolean;
    data: Admin;
}

export interface getAllAdminsResponse {
    success: boolean;
    data: Admin[];
}

export interface deleteAdminResponse {
    success: boolean;
    data: Admin;
}
