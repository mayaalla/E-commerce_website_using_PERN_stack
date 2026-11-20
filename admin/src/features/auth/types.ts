export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
 accessToken: string;
}

export interface LogoutResponse {
    success: boolean;
    message: string;
}

export interface RefreshTokenResponse {
    success: boolean;
    accessToken: string;
}


export interface MeResponse {
    success: boolean;
    data: {
        id: number;
        username: string;
        phoneNumber: string;      
        permissions: string[];
        type: "super_admin" | "regular_admin";
    }
}



export interface AuthState {
  accessToken: string | null;
  status: "checking" | "authenticated" | "unauthenticated";

  setAccessToken: (token: string | null) => void;
  setStatus: (status: AuthState["status"]) => void;
  logout: () => void;
}
