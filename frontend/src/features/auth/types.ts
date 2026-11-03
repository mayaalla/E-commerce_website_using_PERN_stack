export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  usertoken: string;
}

export interface LogoutResponse {
    success: boolean;
    message: string;
}

export interface RefreshTokenResponse {
    success: boolean;
    usertoken: string;
}


export interface MeResponse {
    success: boolean;
    user: {
        id: number;
        username: string;
        phoneNumber: string;      
        permission: string[];
        type: string;
    }
}