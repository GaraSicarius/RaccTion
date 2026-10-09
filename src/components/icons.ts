import {
  BadgeCheck, Banknote, ClipboardList, CreditCard, Download, FileText, IdCard, KeyRound,
  Landmark, Phone, Repeat, Share2, ShoppingBag, Store, Timer, UserPlus, UserRound,
  type LucideIcon,
} from 'lucide-react';

// Category icon name → component. Custom checks pick from this list.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Banknote, CreditCard, Landmark, KeyRound, Phone, IdCard, Repeat, UserPlus, Download,
  ShoppingBag, Share2, UserRound, Store, ClipboardList, Timer, BadgeCheck,
};

export function categoryIcon(name: string | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name]) || FileText;
}
