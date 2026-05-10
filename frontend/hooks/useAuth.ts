import { useEffect } from "react";

import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    if (store.status === "idle") {
      void store.bootstrap();
    }
  }, [store]);

  return store;
}

