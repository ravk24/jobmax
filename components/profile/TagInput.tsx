"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  id: string;
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
};

export function TagInput({ id, label, placeholder, values, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    // Silently ignore duplicates rather than surfacing an error for something
    // the user can see for themselves in the chip list below.
    if (!value || values.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  };

  const remove = (value: string) => {
    onChange(values.filter((entry) => entry !== value));
  };

  return (
    <div>
      <Label htmlFor={id} className="field-label">
        {label}
      </Label>

      <div className="mt-2 flex items-center gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter would otherwise submit the surrounding form.
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          Add
        </Button>
      </div>

      {values.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value}>
              <span className="flex items-center gap-1.5 rounded-md border border-border bg-surface-secondary py-1 pr-1.5 pl-2.5 text-xs leading-4 font-medium text-text-primary">
                {value}
                <button
                  type="button"
                  onClick={() => remove(value)}
                  aria-label={`Remove ${value}`}
                  className="rounded-sm p-0.5 text-text-muted transition-colors hover:text-text-primary"
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
