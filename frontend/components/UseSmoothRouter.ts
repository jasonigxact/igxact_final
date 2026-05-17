"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function useSmoothRouter() {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const push = (url: string) => {
    setIsExiting(true); // trigger exit

    setTimeout(() => {
      router.push(url);
    }, 400); // animation duration match kar
  };

  return { push, isExiting };
}