import {
  Briefcase,
  Car,
  CirclePlus,
  Clapperboard,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  Phone,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { CategoryIconName } from "@/lib/category-schemas";

export const CATEGORY_ICON_COMPONENTS: Record<CategoryIconName, LucideIcon> = {
  Briefcase,
  Laptop,
  Store,
  TrendingUp,
  Gift,
  CirclePlus,
  ShoppingCart,
  Home,
  Car,
  HeartPulse,
  GraduationCap,
  Clapperboard,
  ShoppingBag,
  Repeat,
  Receipt,
  Phone,
  Tag,
};

export function CategoryIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon =
    CATEGORY_ICON_COMPONENTS[name as CategoryIconName] ?? Tag;
  return <Icon className={className} style={style} aria-hidden="true" />;
}
