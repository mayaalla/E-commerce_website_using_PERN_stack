// Admins feature — public surface

// Components
export { default as AdminPanel }    from "./components/AdminPanel";
export { default as AdminTable }    from "./components/AdminTable";
export { default as AddAdminPanel } from "./components/AddAdminPanel";

// Hooks
export { useGetAdmins, adminsQueryKey } from "./hooks/useGetAdmins";
export { useGetAdmin }                  from "./hooks/useGetAdmin";
export { useAddAdmin }                  from "./hooks/useAddAdmin";
export { useUpdateAdmin }               from "./hooks/useUpdateAdmin";
export { useDeleteAdmin }               from "./hooks/useDeleteAdmin";

// API
export { default as getAllAdmins } from "./api/getAdmins";
export { default as getAdmin }     from "./api/getAdmin";
export { default as addAdmin }     from "./api/addAdmin";
export { default as updateAdmin }  from "./api/updateAdmin";
export { default as deleteAdmin }  from "./api/deleteAdmin";

// Types
export type {
    Admin,
    AdminType,
    AdminPermission,
    addAdminRequest,
    addAdminResponse,
    updateAdminRequest,
    updateAdminResponse,
    getAdminResponse,
    getAllAdminsResponse,
    deleteAdminResponse,
} from "./types";
