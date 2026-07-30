import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { PostHogIdentity } from "@/components/analytics/PostHogIdentity";
import { SignInTracker } from "@/components/analytics/SignInTracker";
import { getCurrentUser } from "@/lib/insforge-server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "JobMax — Your AI job hunting assistant",
  description:
    "JobMax finds the jobs, scores them against your profile, and researches the companies so you arrive at every application fully informed.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-surface text-text-primary">
        {/* Identity mounts first so user_signed_in attaches to the right person. */}
        {user && (
          <PostHogIdentity
            userId={user.id}
            email={user.email}
            name={user.profile?.name}
          />
        )}
        <SignInTracker hasSession={!!user} />
        {children}
      </body>
    </html>
  );
}
