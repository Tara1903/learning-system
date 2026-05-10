import { useRouter } from "next/router";
import { useEffect } from "react";

import { useAuth } from "./useAuth";
import { routeForRole } from "@/utils/routes";
import type { UserRole } from "@/utils/types";

export function useRequireAuth(roles?: UserRole[]) {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === "anonymous") {
      void router.replace("/login");
      return;
    }

    if (auth.status === "authenticated" && auth.user && roles && !roles.includes(auth.user.role)) {
      void router.replace(routeForRole(auth.user.role));
    }
  }, [auth.status, auth.user, roles, router]);

  return auth;
}
