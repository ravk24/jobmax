import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

type Props = {
  href?: string;
};

export function Logo({ href = "/" }: Props) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="logo-gradient flex size-9 items-center justify-center rounded-lg">
        <LayoutDashboard className="size-[18px] text-accent-foreground" />
      </span>
      <span className="text-[19px] leading-7 font-bold text-text-darkest">
        JobMax
      </span>
    </Link>
  );
}
