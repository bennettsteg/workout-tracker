import { Dumbbell, History, LineChart, ClipboardList, Scale } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/templates", label: "Templates", icon: ClipboardList },
  { href: "/sessions", label: "History", icon: History },
  { href: "/body-weight", label: "Body Weight", icon: Scale },
  { href: "/analytics", label: "Analytics", icon: LineChart },
] as const;
