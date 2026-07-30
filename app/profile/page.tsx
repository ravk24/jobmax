import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { Logo } from "@/components/layout/Logo";
import { LOGIN_ROUTE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/insforge-server";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(LOGIN_ROUTE);
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
        <Logo />
        <LogoutButton />
      </header>

      <main className="flex-1 bg-background px-6 py-10">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="text-2xl leading-tight font-bold tracking-tight text-text-primary">
            Profile
          </h1>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <p className="text-xs leading-4 text-text-muted">Signed in as</p>
            <p className="mt-1 text-sm leading-5 font-medium text-text-primary">
              {user.email}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
