"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ensureProfileForCurrentUser } from "../../../lib/ensureProfile";

export default function CallbackClient() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/upload";

  useEffect(() => {
    (async () => {
      await ensureProfileForCurrentUser();
      window.location.href = redirect;
    })();
  }, [redirect]);

  return null;
}
