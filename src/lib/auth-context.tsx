import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

export type AuthSnapshot = {
  status: "loading" | "signed-in" | "signed-out";
  user: User | null;
};

export const AuthContext = createContext<AuthSnapshot | null>(null);

export function useAuthSnapshot() {
  const snapshot = useContext(AuthContext);
  if (!snapshot) {
    throw new Error("Authentication state is unavailable outside the root provider.");
  }
  return snapshot;
}
