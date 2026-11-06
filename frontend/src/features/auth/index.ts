// Auth feature — public surface
export { default as LoginForm }       from "./components/LoginForm";
export { default as LogoutButton }    from "./components/LogoutButton";
export { default as AuthGuard }       from "./components/AuthGuard";
export { default as AuthInitializer } from "./components/AuthInitializer";
export { default as FormInput }       from "./components/FormInput";

export { default as useAuthStore }    from "./store/auth.store";

// Hooks
export { useLogin }      from "./hooks/useLogin";
export { useLogout }     from "./hooks/useLogout";
export { useAuthStatus } from "./hooks/useAuthStatus";

export { login }  from "./api/login";
export { logout } from "./api/logout";
export { me }     from "./api/me";

export type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RefreshTokenResponse,
  MeResponse,
  AuthState,
} from "./types";
