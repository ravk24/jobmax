"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { TagInput } from "@/components/profile/TagInput";
import { WorkExperienceCard } from "@/components/profile/WorkExperienceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Education, Profile, WorkExperience } from "@/types";

// Option lists mirror the CHECK constraints in db/schema.sql. Degree has no
// constraint — education is jsonb — so this list is the only definition.
const WORK_AUTHORIZATION = [
  { value: "citizen", label: "Citizen" },
  { value: "permanent_resident", label: "Permanent resident" },
  { value: "visa_required", label: "Visa required" },
];

const EXPERIENCE_LEVEL = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
];

const REMOTE_PREFERENCE = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "any", label: "Any" },
];

const DEGREES = [
  "High School",
  "Associate",
  "Bachelor's",
  "Master's",
  "PhD",
  "Other",
];

const EMPTY_ROLE: WorkExperience = {
  company: "",
  title: "",
  startDate: "",
  endDate: null,
  isCurrent: false,
  responsibilities: "",
};

const SECTION = "border-b border-border pb-8";
const GRID = "mt-4 grid gap-4 sm:grid-cols-2";

type Props = {
  profile: Profile;
};

export function ProfileForm({ profile: initialProfile }: Props) {
  const [profile, setProfile] = useState<Profile>(initialProfile);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const setEducation = <K extends keyof Education>(
    key: K,
    value: Education[K],
  ) =>
    setProfile((current) => ({
      ...current,
      education: {
        degree: "",
        field: "",
        institution: "",
        graduationYear: 0,
        ...(current.education ?? {}),
        [key]: value,
      },
    }));

  const roles = profile.work_experience ?? [];

  const setRole = (index: number, role: WorkExperience) =>
    set(
      "work_experience",
      roles.map((entry, i) => (i === index ? role : entry)),
    );

  // Comma-separated in the UI, string[] in the database.
  const listValue = (values: string[] | null) => (values ?? []).join(", ");
  const parseList = (value: string) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  return (
    <form
      className="rounded-2xl border border-border bg-surface p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="border-b border-border pb-5">
        <h2 className="text-base leading-6 font-semibold text-text-primary">
          Profile Information
        </h2>
        <p className="mt-1 text-sm leading-5 text-text-secondary">
          This context is used to accurately represent you in agent interactions.
        </p>
      </div>

      {/* Personal Info */}
      <section className={`${SECTION} pt-8`}>
        <h3 className="text-sm leading-5 font-semibold text-text-primary">
          Personal Info
        </h3>

        <div className={GRID}>
          <div>
            <Label htmlFor="full_name" className="field-label">
              Full name
            </Label>
            <Input
              id="full_name"
              className="mt-2"
              value={profile.full_name ?? ""}
              placeholder="Your full name"
              onChange={(event) => set("full_name", event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="email" className="field-label">
              Email
            </Label>
            {/* Comes from the auth session — never editable here. */}
            <Input id="email" className="mt-2" value={profile.email} disabled />
          </div>

          <div>
            <Label htmlFor="phone" className="field-label">
              Phone number
            </Label>
            <Input
              id="phone"
              type="tel"
              className="mt-2"
              value={profile.phone ?? ""}
              placeholder="+1 (555) 000-0000"
              onChange={(event) => set("phone", event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="location" className="field-label">
              Location
            </Label>
            <Input
              id="location"
              className="mt-2"
              value={profile.location ?? ""}
              placeholder="City, Country"
              onChange={(event) => set("location", event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="linkedin_url" className="field-label">
              LinkedIn URL
            </Label>
            <Input
              id="linkedin_url"
              type="url"
              className="mt-2"
              value={profile.linkedin_url ?? ""}
              placeholder="https://linkedin.com/in/you"
              onChange={(event) => set("linkedin_url", event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="portfolio_url" className="field-label">
              Portfolio / GitHub
            </Label>
            <Input
              id="portfolio_url"
              type="url"
              className="mt-2"
              value={profile.portfolio_url ?? ""}
              placeholder="https://github.com/you"
              onChange={(event) => set("portfolio_url", event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="work_authorization" className="field-label">
              Work authorization
            </Label>
            <Select
              value={profile.work_authorization ?? undefined}
              onValueChange={(value) =>
                set(
                  "work_authorization",
                  value as Profile["work_authorization"],
                )
              }
            >
              <SelectTrigger id="work_authorization" className="mt-2">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {WORK_AUTHORIZATION.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Professional Info */}
      <section className={`${SECTION} pt-8`}>
        <h3 className="text-sm leading-5 font-semibold text-text-primary">
          Professional Info
        </h3>

        <div className="mt-4">
          <Label htmlFor="current_title" className="field-label">
            Current/recent job title
          </Label>
          <Input
            id="current_title"
            className="mt-2"
            value={profile.current_title ?? ""}
            placeholder="E.g. Frontend Engineer"
            onChange={(event) => set("current_title", event.target.value)}
          />
        </div>

        <div className={GRID}>
          <div>
            <Label htmlFor="experience_level" className="field-label">
              Experience level
            </Label>
            <Select
              value={profile.experience_level ?? undefined}
              onValueChange={(value) =>
                set("experience_level", value as Profile["experience_level"])
              }
            >
              <SelectTrigger id="experience_level" className="mt-2">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVEL.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="years_experience" className="field-label">
              Years of experience
            </Label>
            <Input
              id="years_experience"
              type="number"
              min={0}
              className="mt-2"
              value={profile.years_experience ?? ""}
              placeholder="0"
              onChange={(event) =>
                set(
                  "years_experience",
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <TagInput
            id="skills"
            label="Skills"
            placeholder="Add a skill"
            values={profile.skills ?? []}
            onChange={(values) => set("skills", values)}
          />
        </div>

        <div className="mt-4">
          <TagInput
            id="industries"
            label="Industries worked in (optional)"
            placeholder="E.g. FinTech, Healthcare"
            values={profile.industries ?? []}
            onChange={(values) => set("industries", values)}
          />
        </div>
      </section>

      {/* Work Experience */}
      <section className={`${SECTION} pt-8`}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm leading-5 font-semibold text-text-primary">
            Work Experience
          </h3>
          <button
            type="button"
            onClick={() => set("work_experience", [...roles, EMPTY_ROLE])}
            className="flex items-center gap-1.5 text-sm leading-5 font-medium text-accent transition-colors hover:text-accent-dark"
          >
            <Plus className="size-4" />
            Add role
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {roles.length === 0 ? (
            <p className="text-sm leading-5 text-text-muted">
              No roles added yet. Add up to three.
            </p>
          ) : (
            roles.map((role, index) => (
              <WorkExperienceCard
                key={index}
                index={index}
                role={role}
                onChange={(next) => setRole(index, next)}
                onRemove={
                  roles.length > 1
                    ? () =>
                        set(
                          "work_experience",
                          roles.filter((_, i) => i !== index),
                        )
                    : null
                }
              />
            ))
          )}
        </div>
      </section>

      {/* Education */}
      <section className={`${SECTION} pt-8`}>
        <h3 className="text-sm leading-5 font-semibold text-text-primary">
          Education
        </h3>

        <div className={GRID}>
          <div>
            <Label htmlFor="degree" className="field-label">
              Highest degree
            </Label>
            <Select
              value={profile.education?.degree || undefined}
              onValueChange={(value) => setEducation("degree", value)}
            >
              <SelectTrigger id="degree" className="mt-2">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {DEGREES.map((degree) => (
                  <SelectItem key={degree} value={degree}>
                    {degree}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="field_of_study" className="field-label">
              Field of study
            </Label>
            <Input
              id="field_of_study"
              className="mt-2"
              value={profile.education?.field ?? ""}
              placeholder="E.g. Computer Science"
              onChange={(event) => setEducation("field", event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="institution" className="field-label">
              Institution name
            </Label>
            <Input
              id="institution"
              className="mt-2"
              value={profile.education?.institution ?? ""}
              placeholder="E.g. State University"
              onChange={(event) =>
                setEducation("institution", event.target.value)
              }
            />
          </div>

          <div>
            <Label htmlFor="graduation_year" className="field-label">
              Graduation year
            </Label>
            <Input
              id="graduation_year"
              type="number"
              className="mt-2"
              value={profile.education?.graduationYear || ""}
              placeholder="YYYY"
              onChange={(event) =>
                setEducation("graduationYear", Number(event.target.value))
              }
            />
          </div>
        </div>
      </section>

      {/* Job Preferences */}
      <section className="pt-8">
        <h3 className="text-sm leading-5 font-semibold text-text-primary">
          Job Preferences
        </h3>

        <div className="mt-4">
          <Label htmlFor="job_titles_seeking" className="field-label">
            Job titles seeking
          </Label>
          <Input
            id="job_titles_seeking"
            className="mt-2"
            value={listValue(profile.job_titles_seeking)}
            placeholder="E.g. Frontend Engineer, React Developer"
            onChange={(event) =>
              set("job_titles_seeking", parseList(event.target.value))
            }
          />
        </div>

        <div className={GRID}>
          <div>
            <Label htmlFor="remote_preference" className="field-label">
              Remote preference
            </Label>
            <Select
              value={profile.remote_preference ?? undefined}
              onValueChange={(value) =>
                set("remote_preference", value as Profile["remote_preference"])
              }
            >
              <SelectTrigger id="remote_preference" className="mt-2">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {REMOTE_PREFERENCE.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="salary_expectation" className="field-label">
              Salary expectation (optional)
            </Label>
            <Input
              id="salary_expectation"
              className="mt-2"
              value={profile.salary_expectation ?? ""}
              placeholder="E.g. $120k+"
              onChange={(event) =>
                set("salary_expectation", event.target.value)
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="preferred_locations" className="field-label">
            Preferred locations (optional)
          </Label>
          <Input
            id="preferred_locations"
            className="mt-2"
            value={listValue(profile.preferred_locations)}
            placeholder="E.g. New York, London"
            onChange={(event) =>
              set("preferred_locations", parseList(event.target.value))
            }
          />
        </div>
      </section>

      {/* Persistence lands in Feature 06 — this submits nothing today. */}
      <Button type="submit" className="mt-8 w-full">
        Save Profile
      </Button>
    </form>
  );
}
