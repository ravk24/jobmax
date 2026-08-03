import { BottomCta } from "@/components/homepage/BottomCta";
import { DashboardPreview } from "@/components/homepage/DashboardPreview";
import { Features } from "@/components/homepage/Features";
import { Hero } from "@/components/homepage/Hero";
import { HowItWorks } from "@/components/homepage/HowItWorks";
import { Testimonial } from "@/components/homepage/Testimonial";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { LOGIN_ROUTE, POST_LOGIN_ROUTE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/insforge-server";

export default async function HomePage() {
  const user = await getCurrentUser();
  const ctaHref = user ? POST_LOGIN_ROUTE : LOGIN_ROUTE;

  return (
    <>
      <Navbar
        ctaHref={ctaHref}
        ctaLabel={user ? "Go to dashboard" : "Start for free"}
      />
      <main className="flex-1">
        <Hero ctaHref={ctaHref} />
        <DashboardPreview />
        <Features />
        <HowItWorks />
        <Testimonial />
        <BottomCta ctaHref={ctaHref} />
      </main>
      <Footer />
    </>
  );
}
