import { create } from "zustand";
import { AuthState } from "../types";
import { tokenStore } from "@/lib/auth-token";


const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  status: "checking",

  setAccessToken: (token) => set({ accessToken: token }),

  setStatus: (status) => set({ status }),

  logout: () => set({
    accessToken: null,
    status: "unauthenticated",
  }),
}));

export default useAuthStore;



// read data
// const accessToken = useAuthStore((state) => state.accessToken);

// update data
// const setAccessToken = useAuthStore((state) => state.setAccessToken);
// setAccessToken("newAccessToken");

// const status = useAuthStore((state) => state.status);
// const setStatus = useAuthStore((state) => state.setStatus);
// setStatus("authenticated");

// logout
// const logout = useAuthStore((state) => state.logout);
// logout();

// Read and update outside React components
// const token = useAuthStore.getState().accessToken;
// useAuthStore.getState().setAccessToken("new-token");

