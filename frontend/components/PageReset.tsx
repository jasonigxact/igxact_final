"use client";

import { useEffect } from "react";

export default function PageReset() {
  useEffect(() => {
    document.body.classList.remove("page-exit");
  }, []);

  return null;
}