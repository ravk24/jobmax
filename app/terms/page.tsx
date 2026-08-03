import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { LegalPage } from "@/components/layout/LegalPage";
import { Navbar } from "@/components/layout/Navbar";
import { LOGIN_ROUTE, POST_LOGIN_ROUTE } from "@/lib/auth";
import { getCurrentUser } from "@/lib/insforge-server";

export const metadata: Metadata = {
  title: "Terms & Conditions — JobMax",
};

const SECTIONS = [
  {
    heading: "Acceptance of terms",
    paragraphs: [
      "By creating an account or using JobMax, you agree to these terms. If you do not agree, please do not use the service.",
    ],
  },
  {
    heading: "The service",
    paragraphs: [
      "JobMax helps you organise a job search: it builds a professional profile from information you provide, discovers job listings that may match it, scores those matches, researches companies, and generates application materials at your request.",
      "Job listings and match scores are informational. JobMax does not guarantee the accuracy, availability, or outcome of any listing, and applying to a job always happens on the employer's or job board's own site under their terms.",
    ],
  },
  {
    heading: "Your account",
    paragraphs: [
      "You are responsible for the activity that happens under your account and for keeping access to your sign-in provider secure. You must provide information that is accurate and yours to share — including the contents of any resume you upload.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: [
      "You agree not to misuse the service — including attempting to access other users' data, disrupting or overloading the systems JobMax runs on, using the service to generate misleading application materials, or reselling access to the service.",
    ],
  },
  {
    heading: "Your content",
    paragraphs: [
      "You retain ownership of everything you submit — your profile, your resume, and the documents generated from them. You grant JobMax the limited right to process that content solely to provide the service to you.",
    ],
  },
  {
    heading: "AI-generated content",
    paragraphs: [
      "Match scores, company research, and generated documents are produced with the help of AI models. They can contain mistakes. Review anything JobMax generates before you rely on it or send it to an employer — you are responsible for what you submit in an application.",
    ],
  },
  {
    heading: "Disclaimer and limitation of liability",
    paragraphs: [
      "JobMax is provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, JobMax is not liable for indirect, incidental, or consequential damages arising from your use of the service, including decisions made on the basis of listings, scores, research, or generated documents.",
    ],
  },
  {
    heading: "Termination",
    paragraphs: [
      "You may stop using JobMax at any time and request deletion of your account. We may suspend or terminate accounts that violate these terms.",
    ],
  },
  {
    heading: "Changes to these terms",
    paragraphs: [
      "We may update these terms from time to time. When we do, we will revise the date at the top of this page. Continued use of JobMax after changes take effect constitutes acceptance of the revised terms.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      "Questions about these terms can be sent to support@jobmax.app.",
    ],
  },
];

export default async function TermsPage() {
  const user = await getCurrentUser();

  return (
    <>
      <Navbar
        ctaHref={user ? POST_LOGIN_ROUTE : LOGIN_ROUTE}
        ctaLabel={user ? "Go to dashboard" : "Start for free"}
      />
      <LegalPage
        title="Terms & Conditions"
        lastUpdated="August 3, 2026"
        intro="These terms govern your use of JobMax. They are written to be read — short, plain, and honest about what the service does and does not promise."
        sections={SECTIONS}
      />
      <Footer />
    </>
  );
}
