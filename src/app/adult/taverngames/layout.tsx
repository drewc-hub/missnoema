"use client";

import { useTheme } from "@/composables/useTheme";
import { useFavicon } from "@/components/useFavicon";

export default function Page() {
  useTheme();
  useFavicon();

  return <main>...</main>;
}
