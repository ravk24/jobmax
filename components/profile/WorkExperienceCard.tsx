"use client";

import { Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkExperience } from "@/types";

type Props = {
  index: number;
  role: WorkExperience;
  onChange: (role: WorkExperience) => void;
  onRemove: (() => void) | null;
};

export function WorkExperienceCard({ index, role, onChange, onRemove }: Props) {
  const set = <K extends keyof WorkExperience>(
    key: K,
    value: WorkExperience[K],
  ) => onChange({ ...role, [key]: value });

  return (
    <fieldset className="rounded-xl border border-border p-4">
      <legend className="sr-only">Role {index + 1}</legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`company-${role.id}`} className="field-label">
            Company name
          </Label>
          <Input
            id={`company-${role.id}`}
            className="mt-2"
            value={role.company}
            placeholder="E.g. Vercel"
            onChange={(event) => set("company", event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor={`role-title-${role.id}`} className="field-label">
            Job title
          </Label>
          <Input
            id={`role-title-${role.id}`}
            className="mt-2"
            value={role.title}
            placeholder="E.g. Frontend Engineer"
            onChange={(event) => set("title", event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor={`start-${role.id}`} className="field-label">
            Start date
          </Label>
          <Input
            id={`start-${role.id}`}
            type="month"
            className="mt-2"
            value={role.startDate}
            onChange={(event) => set("startDate", event.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`end-${role.id}`} className="field-label">
              End date
            </Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`current-${role.id}`}
                checked={role.isCurrent}
                onCheckedChange={(checked) => {
                  const isCurrent = checked === true;
                  onChange({
                    ...role,
                    isCurrent,
                    // An end date and "currently working here" cannot both be
                    // true, so clear it rather than leave a stale value behind.
                    endDate: isCurrent ? null : role.endDate,
                  });
                }}
              />
              <Label
                htmlFor={`current-${role.id}`}
                className="text-xs leading-4 font-medium text-text-dark"
              >
                Currently working here
              </Label>
            </div>
          </div>
          <Input
            id={`end-${role.id}`}
            type="month"
            className="mt-2"
            disabled={role.isCurrent}
            value={role.endDate ?? ""}
            onChange={(event) => set("endDate", event.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor={`responsibilities-${role.id}`} className="field-label">
          Key responsibilities
        </Label>
        <Textarea
          id={`responsibilities-${role.id}`}
          className="mt-2"
          value={role.responsibilities}
          placeholder="What did you build, own, or improve?"
          onChange={(event) => set("responsibilities", event.target.value)}
        />
      </div>

      {onRemove ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1.5 text-xs leading-4 font-medium text-text-muted transition-colors hover:text-error"
          >
            <Trash2 className="size-3.5" />
            Remove role
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}
