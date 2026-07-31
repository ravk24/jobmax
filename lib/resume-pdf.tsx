import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";

import { hasRoleContent } from "@/lib/profile";
import type { Profile, WorkExperience } from "@/types";

// Server-only. @react-pdf/renderer pulls in a full PDF engine and a font store;
// importing this from a Client Component ships all of it to the browser to
// render nothing. API routes and lib/ only.

// The one sanctioned exception to the no-hardcoded-hex rule in AGENTS.md. A PDF
// has no stylesheet and cannot resolve a CSS variable, so ui-tokens.md does not
// reach this file. These four are copied from it deliberately, so a generated
// resume looks like it came from JobMax rather than from a word processor —
// which also means they do not update themselves. If the tokens change and this
// matters, change it here too.
const COLOR_TEXT = "#101828"; // --color-text-primary
const COLOR_MUTED = "#6a7282"; // --color-text-secondary
const COLOR_ACCENT = "#7c5cfc"; // --color-accent

// The page budget. build-plan.md asks for a single page and @react-pdf/renderer
// cannot promise one — it paginates whatever it is given. So the constraint is
// enforced upstream instead: these are the numbers the prompt asks the model to
// fit, and the same numbers this file re-applies to whatever comes back. A model
// that ignores the instruction still cannot overflow the page.
export const MAX_SUMMARY_CHARS = 400;
export const MAX_BULLETS_PER_ROLE = 4;
export const MAX_BULLET_CHARS = 160;
const MAX_PDF_SKILLS = 20;

// Written by Gemini; every fact around it comes from the profile row. bullets is
// keyed by WorkExperience.id rather than positional, so a role the model skipped
// or reordered cannot silently take another role's achievements.
export type ResumeProse = {
  summary: string;
  bullets: Record<string, string[]>;
};

// Only the properties library-docs.md lists as supported. Anything else is
// silently ignored — no warning, no error, just a layout that does not match the
// code. Borders and letter spacing are absent for that reason; separation comes
// from margin and weight instead.
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 48,
    paddingRight: 48,
    fontFamily: "Helvetica",
    color: COLOR_TEXT,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 6,
  },
  contactLine: {
    fontSize: 9.5,
    color: COLOR_MUTED,
    lineHeight: 1.5,
  },
  linkLine: {
    fontSize: 9.5,
    color: COLOR_ACCENT,
    lineHeight: 1.5,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLOR_ACCENT,
    marginTop: 18,
    marginBottom: 7,
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.55,
  },
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 3,
  },
  roleTitle: {
    fontSize: 11,
    fontWeight: "bold",
    width: "72%",
  },
  roleDates: {
    fontSize: 9,
    color: COLOR_MUTED,
    textAlign: "right",
    width: "28%",
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: 3,
  },
  bulletMark: {
    fontSize: 10,
    lineHeight: 1.5,
    width: 12,
  },
  bulletText: {
    fontSize: 10,
    lineHeight: 1.5,
    width: "95%",
  },
  role: {
    marginBottom: 11,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.55,
  },
});

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Both writers of these values produce YYYY-MM — <input type="month"> in the
// form, and monthOrEmpty() in lib/resume-extraction.ts. Anything else is dropped
// rather than printed: a raw "2021-3" on a resume is worse than no date.
function formatMonth(value: string | null): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? "");
  if (!match) return "";
  return `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}

function formatDateRange(role: WorkExperience): string {
  const start = formatMonth(role.startDate);
  const end = role.isCurrent ? "Present" : formatMonth(role.endDate);

  if (start && end) return `${start} — ${end}`;
  if (start) return start;
  // An end with no start is odd data, but a bare "Jun 2023" beside a job title
  // reads as the date it started. Naming it costs one word.
  return end ? `Until ${end}` : "";
}

// noValidate on the profile form means a malformed URL is saved as typed, so
// this cannot assume anything is linkable. A bare "linkedin.com/in/me" still
// belongs on the page — it just prints as text rather than becoming a link that
// resolves to nothing.
function isAbsoluteUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

function compact(values: Array<string | null | undefined>): string[] {
  return values
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0);
}

function truncate(value: string, limit: number): string {
  const trimmed = value.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit).trimEnd()}…` : trimmed;
}

type Props = {
  profile: Profile;
  prose: ResumeProse;
};

// Returns the element rather than being rendered as JSX by its caller.
// renderToBuffer is typed (document: ReactElement<DocumentProps>) => …, and a
// JSX element built from a custom component types as JSX.Element, which does not
// satisfy it without an assertion. Calling this as a plain function keeps the
// caller free of casts and free of JSX, so lib/resume-generation.ts stays a .ts
// file.
export function ResumeDocument({
  profile,
  prose,
}: Props): ReactElement<DocumentProps> {
  const contactDetails = compact([
    profile.email,
    profile.phone,
    profile.location,
  ]);
  const links = compact([profile.linkedin_url, profile.portfolio_url]);
  const roles = (profile.work_experience ?? []).filter(hasRoleContent);
  const skills = (profile.skills ?? []).slice(0, MAX_PDF_SKILLS);
  const education = profile.education;
  const summary = truncate(prose.summary ?? "", MAX_SUMMARY_CHARS);

  const educationLine = education
    ? compact([
        [education.degree, education.field].filter(Boolean).join(", "),
        education.institution,
        education.graduationYear > 0 ? String(education.graduationYear) : null,
      ]).join("  •  ")
    : "";

  return (
    <Document
      title={`${profile.full_name ?? "Resume"} — Resume`}
      author={profile.full_name ?? undefined}
      creator="JobMax"
      producer="JobMax"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{profile.full_name ?? ""}</Text>

        {profile.current_title ? (
          <Text style={styles.contactLine}>{profile.current_title}</Text>
        ) : null}

        {contactDetails.length > 0 ? (
          <Text style={styles.contactLine}>
            {contactDetails.join("  •  ")}
          </Text>
        ) : null}

        {links.length > 0 ? (
          <Text style={styles.linkLine}>
            {links.map((link, index) => (
              <Text key={link}>
                {index > 0 ? "  •  " : ""}
                {isAbsoluteUrl(link) ? <Link src={link}>{link}</Link> : link}
              </Text>
            ))}
          </Text>
        ) : null}

        {summary ? (
          <View>
            <Text style={styles.sectionHeading}>SUMMARY</Text>
            <Text style={styles.summary}>{summary}</Text>
          </View>
        ) : null}

        {roles.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>EXPERIENCE</Text>
            {roles.map((role) => {
              const bullets = (prose.bullets[role.id] ?? [])
                .map((bullet) => truncate(bullet, MAX_BULLET_CHARS))
                .filter((bullet) => bullet.length > 0)
                .slice(0, MAX_BULLETS_PER_ROLE);

              return (
                <View key={role.id} style={styles.role} wrap={false}>
                  <View style={styles.roleHeader}>
                    <Text style={styles.roleTitle}>
                      {compact([role.title, role.company]).join(" — ")}
                    </Text>
                    <Text style={styles.roleDates}>
                      {formatDateRange(role)}
                    </Text>
                  </View>

                  {/* The degrade path. Gemini failing must not cost the user
                      their work history, so their own responsibilities text
                      prints as written when no bullets came back. */}
                  {bullets.length > 0 ? (
                    bullets.map((bullet, index) => (
                      <View key={`${role.id}-${index}`} style={styles.bulletRow}>
                        <Text style={styles.bulletMark}>•</Text>
                        <Text style={styles.bulletText}>{bullet}</Text>
                      </View>
                    ))
                  ) : role.responsibilities.trim().length > 0 ? (
                    <Text style={styles.body}>
                      {role.responsibilities.trim()}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {skills.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>SKILLS</Text>
            <Text style={styles.body}>{skills.join("  •  ")}</Text>
          </View>
        ) : null}

        {educationLine ? (
          <View>
            <Text style={styles.sectionHeading}>EDUCATION</Text>
            <Text style={styles.body}>{educationLine}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
