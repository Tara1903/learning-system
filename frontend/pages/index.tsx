import { useRouter } from "next/router";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";
import { routeForRole } from "@/utils/routes";
import { LoadingPanel } from "@/components/LoadingPanel";

export default function IndexPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === "anonymous" || status === "error") {
      void router.replace("/login");
    }

    if (status === "authenticated" && user) {
      void router.replace(routeForRole(user.role));
    }
  }, [router, status, user]);

  return <LoadingPanel label="Loading Adhyayan..." />;
}
