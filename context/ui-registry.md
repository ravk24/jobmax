# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Project-Wide Conventions

Established while building Feature 01. Every component follows these unless noted.

| Concern           | Pattern                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| Page container    | `mx-auto max-w-[1440px] px-6`                                                |
| Section separator | `border-b border-border` on the section, never a spacer div                  |
| Card surface      | `bg-surface border border-border rounded-2xl` + card shadow below            |
| Card shadow       | `shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]`      |
| Section heading   | `text-base leading-6 font-semibold text-text-primary`                        |
| Body text         | `text-sm leading-6 text-text-secondary`                                      |
| Muted / caption   | `text-xs leading-4 text-text-muted`                                          |
| Badge             | `rounded-full px-2 py-0.5 text-[10px] leading-4 font-medium`                 |
| Link hover        | `transition-colors hover:text-text-primary` (or `hover:text-accent` in nav)  |
| Exports           | Named exports only, one component per file                                   |

**Responsive type scale** — marketing headings step down on small screens; the `sm:` value is the design value:

- Page h1: `text-3xl sm:text-5xl`
- Block h2: `text-2xl sm:text-3xl lg:text-4xl`
- Closing CTA h2: `text-2xl sm:text-4xl`

---

## Components

### Button

File: `components/ui/button.tsx`
Last updated: 2026-07-29

shadcn/ui primitive (radix base, `nova` preset), customised to the JobMax system.

| Property         | Class                                                    |
| ---------------- | -------------------------------------------------------- |
| Border radius    | `rounded-md` (base ring changed from shadcn's `rounded-lg`) |
| Variant default  | `bg-primary text-primary-foreground hover:bg-primary/80` (purple) |
| Variant cta      | `bg-text-black text-surface hover:bg-text-slate` (dark)   |
| Variant outline  | `border-border bg-surface text-text-primary hover:bg-surface-secondary` |
| Size cta         | `h-9 gap-2 px-4`                                          |
| Hover zoom       | `hover:scale-101` on the base ring, animated by `transition-all` |
| Focus ring       | `focus-visible:ring-3 focus-visible:ring-ring/50` (ring = accent) |

**Pattern notes:**
Two primary treatments exist deliberately. `variant="default"` is the purple button ui-tokens.md specifies for **app UI** — forms, dashboard, job actions. `variant="cta"` is the near-black button the **marketing pages** use, taken from the delivered landing-page design. Do not use `cta` inside the authenticated app.
`outline` matches ui-tokens.md's Secondary button spec exactly (`bg-surface`, `border-border`) — it is the project's secondary button; do not build a separate one.
Use `size="cta"` for marketing CTAs; shadcn's default sizes are smaller and suit dense app UI.
The 1% hover zoom sits on the base ring, so it applies to **every** button in the project, not just the landing page. If it proves too much for dense app UI (tables, form rows), move `hover:scale-101` onto the `cta` and `outline` variants instead.

---

### Form controls (Input, Textarea, Select, Checkbox, Label)

Files: `components/ui/{input,textarea,select,checkbox,label}.tsx`
Last updated: 2026-07-30

shadcn/ui primitives, customised to the JobMax system. shadcn's semantic vars are already mapped onto project tokens in `globals.css :root` (`--input` → `--color-border`, `--ring` → `--color-accent`), so the primitives inherit the palette; what changed is sizing and surface.

| Property | Class |
| --- | --- |
| Height | `h-10` (shadcn ships `h-8` — too small for this design) |
| Radius | `rounded-md` (8px) |
| Surface | `bg-surface-secondary` — **not** white; this is what separates a field from the card |
| Border | `border-border` |
| Text | `text-sm leading-5 text-text-primary`, placeholder `text-text-muted` |
| Focus | `focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent` |
| Invalid | `aria-invalid:border-error aria-invalid:ring-1 aria-invalid:ring-error` |
| Checkbox checked | `data-checked:border-accent data-checked:bg-accent data-checked:text-accent-foreground` |
| Textarea min height | `min-h-[76px]` |

**Pattern notes:**
Every `dark:` variant shipped by shadcn was stripped — dark mode is deliberately inert in this project, and leaving them in implies a mode that never activates.
Field labels use the **`field-label` utility** in `globals.css` (11px, uppercase, `tracking-wider`, `text-text-secondary`) rather than repeating six classes across three files. Checkbox labels do **not** use it — they are sentence case, `text-xs`, `text-text-dark`.
Adding these did not touch `globals.css`; verified by diff. If shadcn is re-run, check that again — Feature 01 records `shadcn init` overwriting the token layer.

---

### AppNavbar

File: `components/layout/AppNavbar.tsx`
Last updated: 2026-07-30

| Property | Class |
| --- | --- |
| Chrome | `h-16 border-b border-border bg-surface` — identical to `Navbar.tsx` |
| Container | `mx-auto flex max-w-[1440px] items-center justify-between px-6` |
| Item (base) | `flex h-16 items-center gap-2 border-b-2 px-1 text-sm leading-5 font-medium` |
| Item (active) | `border-accent text-accent` |
| Item (inactive) | `border-transparent text-text-dark hover:text-accent` |
| Icon | `size-4 shrink-0` — lucide `LayoutGrid`, `Search`, `User` |

**Pattern notes:**
The authenticated counterpart to `Navbar.tsx`. `"use client"` for `usePathname`; active state matches the exact path or any child path.
The underline is `border-b-2` on a **full-height** item so it lands on the header's own bottom border — a border on the text alone floats above it.
Labels hide below `sm` and the icons carry the nav; the row would otherwise overflow at 430px.
Logo is passed `href="/dashboard"`, per the Logo entry below.

---

### Logo

File: `components/layout/Logo.tsx`
Last updated: 2026-07-29

| Property      | Class                                                       |
| ------------- | ----------------------------------------------------------- |
| Mark          | `logo-gradient size-9 rounded-lg` (36×36, 12px radius)      |
| Mark icon     | `size-[18px] text-accent-foreground` (lucide `LayoutDashboard`) |
| Wordmark      | `text-[19px] leading-7 font-bold text-text-darkest`         |
| Spacing       | `flex items-center gap-2.5`                                 |

**Pattern notes:**
`logo-gradient` is a custom utility in `globals.css` — the gradient's deep stop (`#4A2EC5`) has no token in ui-tokens.md, so it lives in the CSS layer to keep hex out of components. Always render the logo through this component; never rebuild the mark inline. `href` defaults to `/` — pass `/dashboard` when used inside the authenticated app.

---

### Navbar

File: `components/layout/Navbar.tsx`
Last updated: 2026-07-29

| Property         | Class                                                    |
| ---------------- | -------------------------------------------------------- |
| Background       | `bg-surface`                                             |
| Border           | `border-b border-border`                                 |
| Height           | `h-16` (64px)                                            |
| Layout           | `grid grid-cols-[1fr_auto_1fr] items-center px-6`        |
| Nav item         | `text-sm leading-5 font-medium text-text-dark`           |
| Nav item hover   | `transition-colors hover:text-accent`                    |
| Nav gap          | `gap-8`, hidden below `md`                               |

**Props:** `ctaHref`, `ctaLabel` — resolved by the page, not the component. The homepage passes `/dashboard` + "Go to dashboard" when signed in, `/login` + "Start for free" when not. Components hold no auth logic.

**Pattern notes:**
This is the **marketing** navbar — three links plus a `cta` button, no active state. The authenticated app navbar (see `public/dashboard.png`) is a different treatment: icons beside each label, active item in `text-accent` with an underline. Build that as a variant of this file when Feature 14 lands; it will need `"use client"` for `usePathname`.
The three-column grid keeps the nav optically centred regardless of logo or button width.

---

### Footer

File: `components/layout/Footer.tsx`
Last updated: 2026-07-29

| Property     | Class                                                     |
| ------------ | --------------------------------------------------------- |
| Background   | `bg-surface`                                              |
| Border       | `border-t border-border`                                  |
| Spacing      | `px-6 py-8`, `gap-6`                                      |
| Link         | `text-sm leading-5 font-medium text-text-secondary`       |
| Link hover   | `transition-colors hover:text-text-primary`               |
| Layout       | `flex-col sm:flex-row`, `justify-between`                 |

---

### Hero / BottomCta

Files: `components/homepage/Hero.tsx`, `components/homepage/BottomCta.tsx`
Last updated: 2026-07-29

| Property       | Class                                                          |
| -------------- | -------------------------------------------------------------- |
| Background     | `aurora` (custom utility)                                      |
| Border         | `border-b border-border`                                       |
| Spacing        | `px-6 py-20 sm:py-24`, centred column                          |
| Heading        | `font-bold tracking-tight text-text-primary leading-tight`     |
| Subheading     | `mt-6 max-w-xl text-sm leading-6 text-text-dark`               |
| CTA row        | `mt-8 flex flex-wrap justify-center gap-3`                     |
| CTA pair       | `variant="cta"` + `variant="outline"`, both `size="cta"`       |

**Pattern notes:**
`aurora` is a custom utility in `globals.css` — a soft pastel mesh of radial gradients over `bg-surface`. It is the only decorative background in the system and is reserved for full-bleed marketing sections. Never place it on a card (ui-rules.md forbids gradient card backgrounds).
Both sections share the same CTA pair so the page opens and closes on the same action.

---

### DashboardPreview

File: `components/homepage/DashboardPreview.tsx`
Last updated: 2026-07-29

| Property       | Class                                                              |
| -------------- | ------------------------------------------------------------------ |
| Section bg     | `bg-surface-muted`                                                 |
| Frame          | `rounded-t-xl border border-b-0 border-border bg-surface` + card shadow |
| Chrome bar     | `border-b border-border bg-surface-secondary px-4 py-3`            |
| Window dots    | `size-2.5 rounded-full bg-border-muted`                            |
| URL pill       | `rounded-full bg-surface px-3 py-1`, `text-xs text-text-muted`     |
| Image crop     | `max-h-[420px] overflow-hidden`, image `w-full`                    |

**Pattern notes:**
Browser-chrome frame around `public/dashboard.png`. The screenshot is deliberately cropped at the bottom and the frame is bottom-open (`rounded-t-xl`, `border-b-0`) so it reads as continuing past the fold. Uses `next/image` with `priority` — it is the largest above-the-fold asset.
Neutral grey dots here, unlike the traffic-light dots in AgentLogPreview — this frame is a screenshot mount, not a terminal.

---

### FeatureBlock

File: `components/homepage/FeatureBlock.tsx`
Last updated: 2026-07-29

Shared two-column marketing block. Composed by `Features.tsx` and `HowItWorks.tsx`, which supply copy and a visual only.

| Property        | Class                                                             |
| --------------- | ----------------------------------------------------------------- |
| Section border  | `border-b border-border`, grid `border-x border-border`           |
| Column divider  | `lg:border-r` (or `lg:border-l` when `visualFirst`)               |
| Heading cell    | `border-b border-border px-6 py-10 sm:px-8 sm:py-12`              |
| Item            | `border-b border-l-2 border-border px-6 py-6 sm:px-8 last:border-b-0` |
| Item highlight  | `border-l-accent` (else `border-l-transparent`)                   |
| Item title      | `text-base leading-6 font-semibold text-text-primary`             |
| Item body       | `mt-2 text-sm leading-6 text-text-secondary`                      |
| Visual cell     | `flex min-w-0 items-center justify-center bg-surface-muted p-6 sm:p-8` |

**Pattern notes:**
Exactly one item per block carries `highlighted` — the accent left rule is an emphasis device, not a state. Alternating sides comes from `visualFirst`, which flips both grid order and which edge holds the divider; do not duplicate the component to mirror it.
`min-w-0` on the visual cell keeps a wide child from forcing the grid track open.

---

### JobsTablePreview

File: `components/homepage/JobsTablePreview.tsx`
Last updated: 2026-07-29

| Property        | Class                                                             |
| --------------- | ----------------------------------------------------------------- |
| Card            | `rounded-2xl border border-border bg-surface` + card shadow       |
| Scroll          | `overflow-x-auto` on card, `min-w-[360px]` on inner               |
| Row grid        | `grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-3 px-4 py-3`            |
| Row border      | `border-b border-border last:border-b-0`                          |
| Column header   | `text-[10px] leading-4 font-medium tracking-wide text-text-secondary uppercase` |
| Cell text       | `text-xs leading-4 text-text-primary` / `text-text-secondary`     |
| Company mark    | `size-6 rounded-md border border-border bg-surface-secondary`     |
| Match bar track | `h-1 w-10 rounded-full bg-border-light`                           |
| Match bar fill  | `matchScoreBarClass(score)` from `lib/utils.ts`, width via inline style |
| Source — search | `bg-linkedin-light text-linkedin`                                 |
| Source — url    | `bg-surface-secondary text-text-secondary`                        |

**Pattern notes:**
This is the mock used on the homepage, but it is the **reference pattern for the real jobs table** in Feature 09 — match it there rather than inventing a second table style.
Bar fill colour always comes from `matchScoreBarClass()` in `lib/utils.ts` (≥80 `bg-success`, ≥60 `bg-info`, else `bg-warning`) per ui-rules.md § Match Score Bar. Never hardcode the colour at a call site.
The fill width is the one sanctioned inline style in the project — a runtime percentage cannot be expressed as a static Tailwind class.
Source badges use the blue treatment ui-tokens.md documents for LinkedIn, relabelled `Search`/`URL` because `jobs.source` only ever holds those two values.

---

### AgentLogPreview

File: `components/homepage/AgentLogPreview.tsx`
Last updated: 2026-07-29

| Property      | Class                                                          |
| ------------- | -------------------------------------------------------------- |
| Card          | `rounded-2xl border border-border bg-surface` + card shadow    |
| Title bar     | `bg-overlay-dark px-4 py-3`                                    |
| Traffic dots  | `size-2.5 rounded-full` — `bg-error`, `bg-warning`, `bg-success` |
| Filename      | `font-mono text-xs leading-4 text-text-muted`                  |
| Line number   | `w-3 shrink-0 text-right font-mono text-xs text-text-muted`    |
| Log text      | `font-mono text-xs leading-5 text-text-dark`                   |
| Tag — system  | `text-accent font-medium`                                      |
| Tag — scan    | `text-info-dark font-medium`                                   |
| Row spacing   | `gap-3` between lines, `gap-4` between number and text         |

**Pattern notes:**
The only dark surface in the system — `bg-overlay-dark` is reserved for this title bar. Mono type comes from `--font-mono` (JetBrains Mono via next/font); this is the only component that uses it.
Log copy describes real in-scope agent behaviour (discovery, threshold filtering, company research). Do not reintroduce the resume-tailoring or cover-letter lines from the original design mock — those features are out of scope.

---

### Login page / split auth layout

Files: `app/(auth)/login/page.tsx`, `components/auth/OAuthButtons.tsx`
Last updated: 2026-07-29

| Property        | Class                                                              |
| --------------- | ------------------------------------------------------------------ |
| Page shell      | `flex flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]` |
| Form column     | `flex flex-1 flex-col bg-surface px-6 py-10 sm:px-10`              |
| Form stack      | `mx-auto flex w-full max-w-sm flex-1 flex-col`                     |
| Eyebrow         | `text-xs leading-4 font-semibold tracking-widest text-accent uppercase` |
| Heading         | `text-2xl leading-tight font-bold tracking-tight text-text-primary sm:text-3xl sm:leading-[1.2]` |
| Body            | `mt-3 text-sm leading-6 text-text-secondary`                       |
| Error banner    | `rounded-md bg-accent-muted px-3 py-2 text-xs leading-5 text-text-dark`, icon `text-error` |
| Provider button | `<Button variant="outline" size="cta" className="w-full">`         |
| Button stack    | `flex flex-col gap-3`                                              |
| Reassurance     | `mt-4 flex items-center gap-1.5 text-xs leading-5 text-text-muted`, `ShieldCheck` icon |
| Mobile rule     | `mt-10 border-t border-border pt-8 lg:hidden`                      |
| Fine print      | `text-xs leading-5 text-text-muted`                                |

**Pattern notes:**
This is the **split auth page** pattern — a form column plus a decorative showcase column — and replaces the earlier centred single-card treatment. Reuse it for any future standalone auth screen. The form is not in a card: the column's own `bg-surface` against the showcase panel already separates it, and a card inside a full-height white column reads as a box inside a box.
Logo, form, and fine print all sit in the same `max-w-sm` stack so they share a left edge; the stack is centred in its column, and the form block is vertically centred by `flex-1` between the logo and the fine print.
The eyebrow (`WELCOME BACK`) matches the `Testimonial` eyebrow exactly — that is the project's section-label treatment.
Heading here is the marketing scale (`text-2xl`/`sm:text-3xl`), not the `text-base` section-heading scale, because it is the page's h1 and carries the page.
Provider buttons reuse the existing `outline` variant rather than introducing a branded button; brand colour appears nowhere, keeping the page inside the token system.
The error banner is the project's inline error treatment: `bg-accent-muted` with an `AlertCircle` in `text-error`, and `role="alert"`. Copy is mapped from an error **code** in the query string to a human sentence — never render a raw SDK message.
`lucide-react` v1 has no brand marks, so the Google and GitHub logos are inline SVGs using `fill="currentColor"` so they inherit the button's token colour.

---

### AuthShowcase

File: `components/auth/AuthShowcase.tsx`
Last updated: 2026-07-29

| Property     | Class                                                                |
| ------------ | -------------------------------------------------------------------- |
| Background   | `aurora`                                                             |
| Border       | `border-l border-border`                                             |
| Visibility   | `hidden lg:flex lg:flex-col lg:justify-center`                       |
| Spacing      | `lg:px-12 lg:py-12 xl:px-16`, content `mx-auto w-full max-w-md`      |
| Heading      | `text-2xl leading-tight font-bold tracking-tight text-text-primary xl:text-3xl xl:leading-[1.2]` |
| Body         | `mt-4 text-sm leading-6 text-text-dark`                              |
| Block gap    | `mt-8` between heading block, mock, and highlights                   |

**Pattern notes:**
Second sanctioned use of `aurora` after Hero/BottomCta, and the first on a non-marketing page. It stays legal because it is a full-bleed section, not a card. In a narrow tall column the radial stops read more saturated than they do across the hero — that is expected, not a bug.
The heading repeats the Hero's exact copy so the sign-in page reads as continuous with the landing page the user arrived from. Body copy uses `text-text-dark` (not `text-text-secondary`) to match Hero's subheading over the same wash.
Reuses `JobsTablePreview` from `components/homepage/` rather than cloning it. A component being filed under `homepage/` does not make it homepage-only — check there before building a new mock.
Below `lg` the whole panel is dropped and the page becomes a single centred form column; `AuthHighlights` is rendered inside the form column instead so small screens keep the value proposition.

---

### AuthHighlights

File: `components/auth/AuthHighlights.tsx`
Last updated: 2026-07-29

| Property     | Class                                                          |
| ------------ | -------------------------------------------------------------- |
| List         | `flex flex-col gap-4`                                          |
| Row          | `flex items-center gap-3`                                      |
| Icon chip    | `flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface` |
| Icon         | `size-4 text-accent` (lucide)                                  |
| Label        | `text-sm leading-5 font-medium text-text-dark`                 |

**Pattern notes:**
Extracted so the desktop showcase panel and the mobile form column render the same three points from one source — the list appears twice on the page at different breakpoints, never both at once.
The icon chip is the project's **accent-icon chip**: a white bordered square with the icon in `text-accent`. It is a size up from `JobsTablePreview`'s `size-6 rounded-md` company mark and deliberately uses `bg-surface`, so it stays legible on the `aurora` wash and on plain white. Reuse it for any icon-beside-text list.

---

### LogoutButton

File: `components/auth/LogoutButton.tsx`
Last updated: 2026-07-30

| Property     | Class                                                    |
| ------------ | -------------------------------------------------------- |
| Wrapper      | `<form action="/api/auth/logout" method="post">`         |
| Button       | `<Button type="submit" variant="outline" size="cta">`    |
| Icon         | lucide `LogOut`, `data-icon="inline-start"`              |

**Pattern notes:**
A **native form POST**, not a client handler — the logout route replies with a 303 redirect the browser follows on its own. Do not convert it to an `onClick` fetch; that would need manual redirect handling for no gain.
It *is* a Client Component, but only because `onSubmit` fires the analytics call — the navigation itself is still the browser's. The submit handler captures `user_logged_out` and then calls `resetUser()`; order matters, since resetting first would detach the event from the person who logged out.
`data-icon="inline-start"` triggers the `cta` size's tighter left padding (see `button.tsx` size variants) — use it on any leading icon.

---

### Analytics components

Files: `components/analytics/PostHogIdentity.tsx`, `SignInTracker.tsx`, `LoginPageTracker.tsx`
Last updated: 2026-07-30

All three render `null` — they exist only for their effects and have no markup, no tokens, and no visual footprint. They are listed here so nobody rebuilds one or mistakes them for UI.

| Component         | Mounted in              | Props          | Does                                                              |
| ----------------- | ----------------------- | -------------- | ----------------------------------------------------------------- |
| `PostHogIdentity` | `app/layout.tsx`        | `userId`, `email?`, `name?` | `identify()` on every signed-in render               |
| `SignInTracker`   | `app/layout.tsx`        | `hasSession`   | Fires `user_signed_in` when the redirect marker is present, then strips it |
| `LoginPageTracker`| `app/(auth)/login/page.tsx` | `error?`   | Fires `login_page_viewed`, and `oauth_sign_in_failed` when `?error=` is set |

**Pattern notes:**
`PostHogIdentity` was previously a second export inside `LogoutButton.tsx`, which broke the one-component-per-file rule and made the root layout import identity from a file named after a button. Keep effect-only analytics components in `components/analytics/`, never bolted onto a UI component.
`SignInTracker` reads `window.location` in an effect rather than calling `useSearchParams()` — the hook would opt the entire tree out of static rendering to read a value that is only needed after mount.
**`hasSession` is a guard, not a convenience.** The sign-in marker is an ordinary query param, so any visitor can put `?signed_in=1` on any URL and fire the event. The tracker only captures when the server actually rendered a session; it strips the param either way.
Both trackers guard against React StrictMode's development double-invoke with refs. Without that, every dev page load double-counts.

---

### Profile page components

Files: `components/profile/{CompletionIndicator,ResumeUpload,ProfileForm,TagInput,WorkExperienceCard}.tsx`
Last updated: 2026-07-30

| Component | Notes |
| --- | --- |
| `CompletionIndicator` | Banner + SVG ring. Ring is `96px` with `10px` stroke, `-rotate-90` so it starts at 12 o'clock, progress via `strokeDasharray` / `strokeDashoffset`. Track `stroke-error/15`, fill `stroke-error`. Missing-field pills: `rounded-sm bg-error/10 text-error` uppercase |
| `ResumeUpload` | Dropzone is `rounded-xl border border-dashed border-border-muted`; icon in a `size-10 rounded-full bg-accent-muted` circle |
| `ProfileForm` | `"use client"`, local state only. Sections separated by `border-b border-border pb-8` + `pt-8`, never spacer divs. Two-column rows are `grid gap-4 sm:grid-cols-2` |
| `TagInput` | Shared by Skills **and** Industries — build once. Enter is intercepted (`preventDefault`) so it adds a tag instead of submitting the form. Duplicates are ignored silently |
| `WorkExperienceCard` | `fieldset` + `sr-only` legend. Checking "Currently working here" disables the end-date input **and** clears its value, so a stale date cannot survive. Every element id derives from `role.id`, never the array index |

**Pattern notes:**
Card surfaces reuse the project card recipe exactly (`rounded-2xl border border-border bg-surface p-6` + card shadow). The banner stays **white** despite the mock reading faintly pink — `ui-rules.md § Cards` forbids coloured card surfaces, and the red lives in the icon, pills and ring instead.
The form omits the **Cover Letter Tone** dropdown that `build-plan.md` Feature 05 lists. The design does not show it and cover letter generation is in `project-overview.md`'s out-of-scope list. `profiles.cover_letter_tone` still exists in the schema, unused.
Completion is **derived** via `calculateCompletion()` in `lib/profile.ts`, never stored — see `progress-tracker.md`.
**Roles are keyed by `role.id`, not array index.** `WorkExperience` carries a `id` generated with `crypto.randomUUID()` in the click handler — never during render, which would break hydration. Index keys plus index-derived element ids meant removing a middle role re-pointed both React state and every `label htmlFor` binding.
The role list is capped at `MAX_WORK_EXPERIENCE` (3) from `lib/profile.ts`; past the cap the "Add role" button is replaced by a message rather than left clickable.

---

### Profile page shell / app header

File: `app/profile/page.tsx`
Last updated: 2026-07-29

| Property     | Class                                                                |
| ------------ | -------------------------------------------------------------------- |
| Header       | `flex h-16 items-center justify-between border-b border-border bg-surface px-6` |
| Page body    | `flex-1 bg-background px-6 py-10`                                    |
| Container    | `mx-auto max-w-[1440px]`                                             |
| Page h1      | `text-2xl leading-tight font-bold tracking-tight text-text-primary`  |
| Card         | `rounded-2xl border border-border bg-surface p-6` + card shadow      |
| Field label  | `text-xs leading-4 text-text-muted`                                  |
| Field value  | `mt-1 text-sm leading-5 font-medium text-text-primary`               |

**Pattern notes:**
**This is a placeholder, not Feature 05.** It exists only so post-login has somewhere to land. The real profile page (form, resume upload, completion indicator) replaces this body wholesale — keep the header and container, discard the rest.
The header is a **minimal app header**, deliberately not the full app navbar: logo left, logout right, no nav links. When the real app navbar lands in Feature 14 (icons beside labels, active item `text-accent` + underline, needs `"use client"` for `usePathname`), it replaces this header everywhere and this pattern retires.
`h-16` + `border-b border-border` + `bg-surface` matches `Navbar.tsx` exactly, so the two headers are the same height and weight when swapped.
Page background is `bg-background` (grey) against the header's `bg-surface` (white) — the standard authenticated-app split from `public/dashboard.png`, and the first place in the project it appears.

---

### Testimonial

File: `components/homepage/Testimonial.tsx`
Last updated: 2026-07-29

| Property     | Class                                                                |
| ------------ | -------------------------------------------------------------------- |
| Background   | `bg-surface`                                                         |
| Border       | `border-b border-border`                                             |
| Eyebrow      | `text-xs leading-4 font-semibold tracking-widest text-accent uppercase` |
| Quote        | `text-lg leading-7 sm:text-2xl sm:leading-9 font-medium text-text-primary` |
| Avatar       | `size-10 rounded-full bg-accent-light text-sm font-semibold text-accent` |
| Name         | `text-sm leading-5 font-medium text-text-primary`                    |
| Role         | `text-xs leading-4 text-text-muted`                                  |

**Pattern notes:**
Initials avatar on `bg-accent-light` — no photo asset was supplied. This is the reusable avatar pattern; reuse it for the profile page.
Markup is `figure` > `blockquote` + `figcaption` so the attribution is semantically bound to the quote.
The quote and attribution are **placeholder copy from the design mock** — replace with a real, attributable testimonial before this page goes public.
