import {
  ArrowLeftRight,
  ArrowRightLeft,
  Bell,
  ChartColumn,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Tags,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/transfers", label: "Transferts", icon: ArrowRightLeft },
      { href: "/accounts", label: "Comptes", icon: Wallet },
      { href: "/budgets", label: "Budgets", icon: PiggyBank },
      { href: "/goals", label: "Objectifs", icon: Target },
    ],
  },
  {
    title: "Pilotage",
    items: [
      { href: "/analytics", label: "Analyses", icon: ChartColumn },
      { href: "/categories", label: "Catégories", icon: Tags },
    ],
  },
  {
    title: "Système",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function getNavLabel(pathname: string): string {
  const match = NAV_ITEMS.filter((item) =>
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Financia";
}
