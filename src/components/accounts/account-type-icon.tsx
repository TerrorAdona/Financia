import {
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AccountType } from "@prisma/client";

export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  BANK: Landmark,
  CASH: Banknote,
  MOBILE_MONEY: Smartphone,
  SAVINGS: PiggyBank,
  CARD: CreditCard,
  OTHER: Wallet,
};

export function AccountTypeIcon({
  type,
  className,
}: {
  type: AccountType;
  className?: string;
}) {
  const Icon = ACCOUNT_TYPE_ICONS[type];
  return <Icon className={className} aria-hidden="true" />;
}
