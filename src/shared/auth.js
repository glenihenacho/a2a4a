import { createAuthClient } from "better-auth/react";

const baseURL = typeof window !== "undefined" ? `${window.location.origin}/api/auth` : "http://localhost:3001/api/auth";

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
});

export const { useSession, signIn, signUp, signOut } = authClient;
