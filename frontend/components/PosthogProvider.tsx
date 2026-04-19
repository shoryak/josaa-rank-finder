"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function PosthogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: "https://app.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, []);

  return <>{children}</>;
}
