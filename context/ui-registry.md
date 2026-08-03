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
| Card padding      | `p-6` content card · `p-3` control strip · **none** on a table card (rows carry `px-6 py-4`) |
| Uppercase label   | `field-label` utility (11px) for form fields · `text-xs … tracking-wider` (12px) for table column headers · `text-xs … tracking-widest text-accent` for section eyebrows |
| Section heading   | `text-base leading-6 font-semibold text-text-primary`                        |
| Body text — app   | `text-sm leading-5 text-text-secondary`                                      |
| Body text — marketing | `text-sm leading-6 text-text-dark` (or `text-text-secondary`)            |
| Muted / caption   | `text-xs leading-4 text-text-muted`                                          |
| Badge             | `rounded-full px-2 py-0.5 text-[10px] leading-4 font-medium`                 |
| Link hover        | `transition-colors hover:text-text-primary` (or `hover:text-accent` in nav)  |
| Disabled link     | Render a real `<button disabled>` instead — never a styled `<a>`             |
| Exports           | Named exports only, one component per file                                   |

**Body text is two tiers, not one** (corrected 2026-07-31 by `/imprint`). This row used to read `text-sm leading-6` for everything, which described the **minority** pattern: the codebase carries 27 uses of `leading-5` against 6 of `leading-6`. The split is not drift — it is coherent and worth keeping:

- **`leading-5` — app surfaces.** Navbar, footer, profile card, form controls, status lines. Dense, functional, sits next to inputs.
- **`leading-6` — marketing and full-bleed prose.** Hero, BottomCta, FeatureBlock, AuthShowcase, login, `global-error`. Longer sentences, more air.

Phases 3–5 (Find Jobs, Job Details, Dashboard) are all **app surfaces** — they take `leading-5`. Following the old single rule would have made every one of them subtly looser than the profile page beside it.

**Disabling a link means changing the element.** An `<a>` has no `disabled` attribute, so `pointer-events-none` plus reduced opacity leaves it focusable and still announced as an available link. Render a real `<button disabled>` with identical styling for the disabled state and swap between them — see `§ Download button`.

**Four uppercase micro-labels exist, and they are not interchangeable** (recorded 2026-07-31 by `/imprint`). `field-label` (11px, `0.06em`) belongs to form fields. Table column headers are 12px `tracking-wider` per `ui-rules.md § Table`. Section eyebrows are 12px `tracking-widest` in `text-accent`. `JobsTablePreview` uses a fourth, 10px `tracking-wide`, because it is a shrunken mock — **do not copy that one into real UI.** Pick by role, not by which file you happened to be reading.

**Button geometry comes from a `size` variant, with exactly one recorded exception.** A sweep of every `<Button>` in the project found `size="cta"` (marketing and card actions), `size="lg"` (pager steps, added Feature 09), and one hand-rolled geometry: the Find Jobs submit button — see `§ Search controls card`. If a second hand-rolled button appears, the answer is a new size variant in `button.tsx`, not a second override. Note that `cta` and `lg` are **both `h-9`** and differ only in padding; the names do not say so, so read the variant before assuming a height.

**Responsive type scale** — marketing headings step down on small screens; the `sm:` value is the design value:

- Page h1: `text-3xl sm:text-5xl`
- Block h2: `text-2xl sm:text-3xl lg:text-4xl`
- Closing CTA h2: `text-2xl sm:text-4xl`

---

## Components

### Button

File: `components/ui/button.tsx`
Last updated: 2026-08-03

shadcn/ui primitive (radix base, `nova` preset), customised to the JobMax system.

| Property         | Class                                                    |
| ---------------- | -------------------------------------------------------- |
| Border radius    | `rounded-md` (base ring changed from shadcn's `rounded-lg`) |
| Variant default  | `bg-primary text-primary-foreground hover:bg-primary/80` (purple) |
| Variant cta      | `bg-text-black text-surface hover:bg-text-slate` (dark)   |
| Variant outline  | `border-border bg-surface text-text-primary hover:bg-surface-secondary` |
| Size cta         | `h-9 gap-2 px-4`                                          |
| Size xl          | `h-12 gap-2 px-4` — the full-width Apply Now on job details |
| Hover zoom       | `hover:scale-101` on the base ring, animated by `transition-all` |
| Focus ring       | `focus-visible:ring-3 focus-visible:ring-ring/50` (ring = accent) |

**Pattern notes:**
Two primary treatments exist deliberately. `variant="default"` is the purple button ui-tokens.md specifies for **app UI** — forms, dashboard, job actions. `variant="cta"` is the near-black button the **marketing pages** use, taken from the delivered landing-page design. Do not use `cta` inside the authenticated app.
`outline` matches ui-tokens.md's Secondary button spec exactly (`bg-surface`, `border-border`) — it is the project's secondary button; do not build a separate one.
Use `size="cta"` for marketing CTAs; shadcn's default sizes are smaller and suit dense app UI.
The 1% hover zoom sits on the base ring, so it applies to **every** button in the project, not just the landing page. If it proves too much for dense app UI (tables, form rows), move `hover:scale-101` onto the `cta` and `outline` variants instead.
`size="xl"` was added in Feature 12 for the job details Apply Now, which the design draws taller than any existing size. It went in here rather than as a `className` override at the call site, which is what the size-variant rule at the top of this file requires — the same reasoning that turned the pagination steps into real `Button`s.

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

### Form layout (composition)

File: `components/profile/ProfileForm.tsx`
Last updated: 2026-07-30

How fields are **assembled** into a form. The entry above covers the controls themselves; this is the rhythm around them, and it is the reference for every future form (Features 09, 12).

| Property         | Class                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Background       | `bg-surface`                                                           |
| Border           | `border border-border`                                                 |
| Border radius    | `rounded-2xl`                                                          |
| Text — primary   | Form title `text-base leading-6 font-semibold`; section heading `text-sm leading-5 font-semibold` |
| Text — secondary | `text-sm leading-5 text-text-secondary`; caption `text-xs leading-4 text-text-muted` |
| Spacing          | Card `p-6`; header `border-b border-border pb-5`; section `border-b border-border pb-8` + `pt-8`; field block `mt-4`; label→control `mt-2`; submit `mt-8` |
| Hover state      | Inline action `text-accent transition-colors hover:text-accent-dark`   |
| Shadow           | `shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]` |
| Accent usage     | Inline actions only (e.g. "Add role"); never on the section chrome     |

**Pattern notes:**
**Sections are separated by their own bottom border, never a spacer div** — `const SECTION = "border-b border-border pb-8"` applied with `pt-8`. The **last section omits the border** (`pt-8` alone) so the form does not end in a rule immediately above the submit button.
**Two-column rows are a single shared constant** — `const GRID = "mt-4 grid gap-4 sm:grid-cols-2"`. Extracting `SECTION` and `GRID` to consts at module scope is the convention to copy; repeating the strings is how the rhythm drifts.
Every label is the `field-label` utility with the control at `mt-2`. A field that stands alone (not in a grid) gets `mt-4`.
The submit button is `w-full` — full-bleed at the foot of the card, not right-aligned.
Forms carry **`noValidate`**. Native constraint validation (`type="url"`, `required`, `pattern`) cancels submission and fires no submit event, so the handler never runs and the failure is completely silent. Validation belongs to the server, which names the field it rejected. See `progress-tracker.md § Feature 06`.

---

### AppNavbar

File: `components/layout/AppNavbar.tsx`
Last updated: 2026-08-03

| Property | Class |
| --- | --- |
| Chrome | `h-16 border-b border-border bg-surface` — identical to `Navbar.tsx` |
| Container | `mx-auto flex max-w-[1440px] items-center justify-between px-6` |
| Item (base) | `flex h-16 items-center gap-2 border-b-2 px-1 text-sm leading-5 font-medium` |
| Item (active) | `border-accent text-accent` |
| Item (inactive) | `border-transparent text-text-dark hover:text-accent` |
| Icon | `size-4 shrink-0` — lucide `LayoutGrid`, `Search`, `User` |
| Account mark | `size-6 shrink-0 text-text-secondary` — lucide `CircleUser`, `aria-hidden` |
| Sign out | `<LogoutButton />` — `Button variant="outline" size="cta"` + `LogOut` icon |

**Pattern notes:**
The authenticated counterpart to `Navbar.tsx`. `"use client"` for `usePathname`; active state matches the exact path or any child path.
The underline is `border-b-2` on a **full-height** item so it lands on the header's own bottom border — a border on the text alone floats above it.
Labels hide below `sm` and the icons carry the nav; the row would otherwise overflow at 430px.
Logo is passed `href="/dashboard"`, per the Logo entry below.
**The account mark is decorative and the Sign out button is real** (added Feature 12, from `context/design/job-details.png`). There is no account menu in this project — `ui-rules.md` allows a top navbar only — so the `CircleUser` glyph is `aria-hidden` and carries no behaviour. It is deliberately **not** the initials avatar recorded under Testimonial: that pattern needs the user's email threaded into a client component, for a mark nobody can click.
**`LogoutButton` had existed since Feature 02 and was mounted nowhere.** Mounting it here is what finally made the logout path, and the `user_logged_out` event, reachable — a component that nothing imports is not shipped, however finished it looks.

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
This is the mock used on the homepage, and it was the **reference pattern for the real jobs table** — Feature 09 built `components/find-jobs/JobsTable.tsx` from this grid rather than inventing a second table style. See that entry for how the two differ (five columns, app body scale, `<Link>` rows).
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
Last updated: 2026-07-31 (Feature 08 gave `CompletionIndicator` a complete state)

All three cards share the project card surface verbatim — `rounded-2xl border border-border bg-surface p-6` plus the card shadow. Body copy is `text-sm leading-5 text-text-secondary`, captions `text-xs leading-4 text-text-muted`, headings `text-base leading-6 font-semibold text-text-primary`.

| Component | Notes |
| --- | --- |
| `CompletionIndicator` | Banner + SVG ring, in **two states**. Ring is `96px` with `10px` stroke, `-rotate-90` so it starts at 12 o'clock, progress via `strokeDasharray` / `strokeDashoffset`. Incomplete: `AlertCircle text-error`, "Profile needs attention", track `stroke-error/15`, fill `stroke-error`, missing-field pills `rounded-sm bg-error/10 text-error` uppercase. Complete: `CheckCircle2 text-success-dark`, "Profile complete", track `stroke-success/15`, fill `stroke-success`, no pills. See its own entry below |
| `ResumeUpload` | `"use client"` since Feature 06. Dropzone is `rounded-xl border border-dashed border-border-muted`; icon in a `size-10 rounded-full bg-accent-muted` circle. Drag-over swaps the dashed border to `border-accent bg-accent-muted` via `transition-colors`. File input is `hidden` and driven by a ref from the Select Resume button. The uploaded filename is an accent link opening in a new tab — `text-accent underline-offset-2 hover:text-accent-dark hover:underline`, with `target="_blank" rel="noopener noreferrer"` |
| `ProfileForm` | `"use client"`, local state. Sections separated by `border-b border-border pb-8` + `pt-8`, never spacer divs. Two-column rows are `grid gap-4 sm:grid-cols-2`. Submit runs through `useTransition`; the button disables and reads "Saving…" while pending. Carries `noValidate` — see `progress-tracker.md § Feature 06` |
| `TagInput` | Shared by Skills **and** Industries — build once. Enter is intercepted (`preventDefault`) so it adds a tag instead of submitting the form. Duplicates are ignored silently |
| `ProfileLoadError` | Whole-section failure state, shown **instead of** the form. See its own entry below |
| `WorkExperienceCard` | `fieldset` + `sr-only` legend. Checking "Currently working here" disables the end-date input **and** clears its value, so a stale date cannot survive. Every element id derives from `role.id`, never the array index |

**Pattern notes:**
**A comma-separated text input must hold its own raw string.** Job Titles Seeking and Preferred Locations are plain `Input`s, not `TagInput`s, because the design shows them that way. Driving `value` from `listValue(profile.field)` while `onChange` writes `parseList(text)` round-trips every keystroke through an array — and `parseList` drops empty entries, so the comma in "React, Vue" is parsed away and re-rendered gone the instant it is typed. The comma can never be entered and a second value is impossible. Each field keeps a `useState` string for display and writes the parsed array alongside it. **Any future comma-separated input needs the same split**, or use `TagInput` where the design allows.
Card surfaces reuse the project card recipe exactly (`rounded-2xl border border-border bg-surface p-6` + card shadow). The banner stays **white** despite the mock reading faintly pink — `ui-rules.md § Cards` forbids coloured card surfaces, and the red lives in the icon, pills and ring instead.
The form omits the **Cover Letter Tone** dropdown that `build-plan.md` Feature 05 lists. The design does not show it and cover letter generation is in `project-overview.md`'s out-of-scope list. `profiles.cover_letter_tone` still exists in the schema, unused.
Completion is **derived** via `calculateCompletion()` in `lib/profile.ts`, never stored — see `progress-tracker.md`.
**Roles are keyed by `role.id`, not array index.** `WorkExperience` carries a `id` generated with `crypto.randomUUID()` in the click handler — never during render, which would break hydration. Index keys plus index-derived element ids meant removing a middle role re-pointed both React state and every `label htmlFor` binding.
The role list is capped at `MAX_WORK_EXPERIENCE` (3) from `lib/profile.ts`; past the cap the "Add role" button is replaced by a message rather than left clickable.

---

### ProfileLoadError — whole-section failure state

File: `components/profile/ProfileLoadError.tsx`
Last updated: 2026-07-30

The project's first **section-level failure state**: what replaces a block of UI when its data cannot be read at all. Distinct from the inline error treatments below and on the login page.

| Property         | Class                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Background       | `bg-surface`                                                        |
| Border           | `border border-border`                                              |
| Border radius    | `rounded-2xl`                                                       |
| Text — primary   | `text-base leading-6 font-semibold text-text-primary`               |
| Text — secondary | `text-sm leading-5 text-text-secondary`, capped `max-w-md`          |
| Spacing          | `px-6 py-12`; icon→heading `mt-4`, heading→body `mt-1`, body→CTA `mt-5` |
| Hover state      | inherited from `Button variant="outline"`                           |
| Shadow           | `shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]` |
| Accent usage     | `size-10 rounded-full bg-accent-muted` medallion, `AlertCircle` `size-5 text-error` |

**Pattern notes:**
Card recipe is the project standard, with `px-6 py-12` instead of `p-6` — the taller padding is what makes a centred single-message state read as deliberate rather than as a collapsed card. **Use `px-6 py-12` for any future centred empty or failure state.**
**The failure medallion is an `bg-accent-muted` circle with the error colour in the icon — never an error-tinted circle.** `app/global-error.tsx` set this and it is the pattern to copy: `size-10 rounded-full bg-accent-muted` wrapping `AlertCircle size-5 text-error`. `AlertCircle` is the project's error icon everywhere it appears — `global-error.tsx`, the login banner, `CompletionIndicator`. Do not reach for another lucide alert glyph.
Body copy is `text-text-secondary`, matching `global-error.tsx`. `ui-rules.md § Empty States` specifies `text-text-muted`, but that rule governs *empty* sections; a failure state follows `global-error.tsx` instead.
Copy must state that nothing was changed. This state exists because the alternative — rendering an empty form — invites the user to save blanks over data that is merely unreachable. The reassurance is load-bearing, not decoration.
Never rendered beside the thing that failed. It replaces it.
The retry is a client `router.refresh()`, which is why this is a `"use client"` component despite having no other interactivity.

---

### Async status feedback (inline)

Files: `components/profile/{ProfileForm,ResumeUpload}.tsx`
Last updated: 2026-07-30

The project has **no toast component** and the design specifies none. Async results are reported inline, next to the control that triggered them.

| Property        | Class                                                     |
| --------------- | --------------------------------------------------------- |
| Status line     | `mt-3 text-sm leading-5` + `role="status"`                |
| Success colour  | `text-success-dark`                                        |
| Error colour    | `text-error`                                               |
| Pending button  | `disabled` + label swapped to a present-continuous verb    |
| Alignment       | Follows its trigger — `text-center` under a `w-full` button, left-aligned beside an auto-width one |

**Pattern notes:**
`role="status"` on the message so a screen reader announces the outcome without moving focus.
The status clears when the action is retried, so a stale success never sits beside a fresh failure.
Pending state comes from `useTransition` for Server Actions and from local state for `fetch` calls — either way the trigger disables, so a double click cannot fire twice.
Messages are always human-readable. Raw SDK and PostgREST errors are logged with a `[path]` prefix and replaced with plain copy, per `code-standards.md § Error Handling`.
**If a toast is ever introduced, it replaces this pattern rather than sitting beside it** — two feedback mechanisms for the same class of event is worse than either alone.

**One status line per control, not one per card** (added Feature 07). The resume card now holds **three**: the upload chain inside the dropzone, the extraction line below it, and the generation line under the bottom strip (Feature 08). Folding them together would let an upload error hide an extraction result, and would put the message inside a surface that opens the file picker when clicked. When a card grows another async control, give it its own line rather than sharing.

**A degraded success is not styled as a success** (added Feature 08). `POST /api/resume/generate` can succeed while delivering less than the button promised — the PDF is written, but Gemini failed and the wording is the user's own rather than rewritten. That renders in `text-error`, not `text-success-dark`, and the copy says what happened and that a retry may fix it. A green line under a button labelled Generate would tell the user the AI polish worked when it did not, and they would only find out by reading the file they now have to look for a reason to distrust.

---

### Extract from Resume button

File: `components/profile/ResumeUpload.tsx`
Last updated: 2026-07-31

Second action in the resume dropzone, appearing only once a resume exists.

| Property        | Class / value                                                       |
| --------------- | ------------------------------------------------------------------- |
| Button row      | `mt-4 flex flex-wrap items-center justify-center gap-3`             |
| Extract button  | `variant="outline"`, matching Select Resume beside it                |
| Pending label   | `Extracting…`, with `disabled`                                       |
| Status line     | `mt-3 text-sm leading-5` + `role="status"`, **outside** the dropzone  |

**Pattern notes:**
**One accent action per card.** Extract was built as `variant="default"` and stepped down in review: the resume card's primary is already Generate Resume from Profile, which comes from the design mock. A button added later does not out-rank a decision the mock made — even when, as here, it is arguably the more useful action. Any new control on an existing card inherits that card's hierarchy rather than redefining it.
Both buttons disable on either pending flag, so a file cannot be swapped mid-extraction. The dropzone's own `onClick`, `onDrop` and cursor class share that flag.
`event.stopPropagation()` on both buttons — the dropzone surface opens the file picker, so without it the click reaches two handlers.
No icon on Extract, so it does not compete with the `FileText` on Generate Resume in the strip below.
Visibility keys off the resume itself. It used to be stated as "never off the signed URL" — the signed URL is gone, but the rule generalises: gate an action on the thing existing, not on a derived handle that can fail to produce.

---

### Download button

File: `components/profile/ResumeUpload.tsx`
Last updated: 2026-07-31

Third control in the dropzone row, beside Extract from Resume. Renders under the same condition — only once a resume exists, uploaded or generated.

| Property | Class / value |
| --- | --- |
| Element | `<Button asChild variant="outline">` wrapping `<a href="/api/resume/download" download>` |
| Icon | `Download` from `lucide-react`, `size-4`, leading |
| Label | `Download` |
| Disabled while busy | **Yes** — swaps to a real `<button disabled>` |

**Pattern notes:**
**An anchor, not a `fetch`.** A same-origin navigation carries the httpOnly session cookie automatically, so the request is authenticated without a line of JavaScript — and `code-standards.md` reserves client-side `fetch()` for mutations, which a download is not. `asChild` renders the anchor with button styling, so it matches Select Resume and Extract exactly while staying a real link that middle-click and right-click behave normally on.
**It is the only route to the bytes.** The bucket is private and the browser holds no InsForge credentials, so `GET /api/resume/download` re-reads the session, derives the key from it, and streams the object back. The previously rendered signed-URL link on the filename has been retired — one authenticated path, not two.
**Disabling an anchor means rendering a different element.** While busy this becomes a genuine `<button disabled>` with the same label and icon, not a link wearing `pointer-events-none` — an anchor has no `disabled` attribute, and faking it lies to assistive technology. Two elements is the honest version. It reads as one control because the styling is identical.
It was originally left enabled on the reasoning that a read cannot disturb a write. That stopped being true when upload and generation began removing the stored object before writing the new one: for the length of either, there is nothing at the other end of the href. **When a write becomes non-atomic, every read affordance pointing at it needs revisiting.**
`event.stopPropagation()` like its siblings: the dropzone surface opens the file picker.
The filename below the buttons is now **plain text**. It was an accent link to the signed URL — a second, more visually prominent way to reach the same file, styled as an action while reading as a label.

---

### CompletionIndicator — the complete state

File: `components/profile/CompletionIndicator.tsx`
Last updated: 2026-07-31

The banner shipped in Feature 05 with **only** the incomplete state, because the design mock only shows that one. A finished profile therefore rendered a red ring reading 100% under the heading "Profile needs attention" — the component said the opposite of what it measured.

| | Incomplete | Complete |
| --- | --- | --- |
| Icon | `AlertCircle` `text-error` | `CheckCircle2` `text-success-dark` |
| Heading | Profile needs attention | Profile complete |
| Ring track | `stroke-error/15` | `stroke-success/15` |
| Ring fill | `stroke-error` | `stroke-success` |
| Pills | one per missing field | none rendered |

Body copy swaps too — the incomplete version asks the user to fill the gaps, the complete version confirms what they have unlocked (matching and resume generation) rather than just saying "done".

**Pattern notes:**
**One `aria-live="polite"` over the whole banner, not `role="status"` on the percentage.** The heading, the ring and the number all change together; the announcement worth hearing is "Profile complete", and the percentage alone used to be the only part a screen reader was told about. Do not nest a second live region inside it — some screen readers then announce twice.
**The state is driven by `missingFields.length === 0`, never by `percentage === 100`.** They agree today because `calculateCompletion()` derives both from the same array, but a percentage rounds — 100 with one field still outstanding is reachable the moment `REQUIRED_FIELDS` stops dividing evenly, and that would congratulate someone whose profile is not finished. The list is the fact; the percentage is a display of it.
The percentage text stays `text-text-primary` in both states. It is the neutral element the ring colours around it; making it green as well is one signal too many.
**Any future status banner needs both states designed before it ships.** This one carried a permanent red alert for two features because only the failure case had a mock.

---

### Generate Resume from Profile — two-step destructive confirm

File: `components/profile/ResumeUpload.tsx`
Last updated: 2026-07-31

The resume card's primary action, in the bottom strip below the dropzone. It **replaces the stored resume**, so it arms on the first click and fires on the second.

| Property           | Class / value                                                                     |
| ------------------ | --------------------------------------------------------------------------------- |
| Strip              | `mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between` |
| Button group       | `flex flex-wrap items-center gap-3`                                                |
| Generate button    | `variant="default"` — the card's one accent action, unchanged from the design mock |
| Resting label      | `Generate Resume from Profile` with a `FileText` icon                              |
| Armed label        | `Replace my resume`, **no icon**                                                   |
| Pending label      | `Generating…`, with `disabled`                                                     |
| Cancel             | `variant="outline"`, rendered only while armed                                     |
| Status line        | `mt-3 text-sm leading-5` + `role="status"`, below the strip                        |

**Pattern notes:**
**The warning lives in the strip copy, not in the button.** Armed, the left-hand line swaps from "Need a fresh document based on the fields below?" to the two things the user cannot otherwise know: that this replaces their current resume, and that it builds from the **last saved profile** rather than unsaved edits in the form below. A button label cannot carry both without becoming a paragraph.
**No dialog, deliberately.** The project has no dialog component and this does not warrant introducing one. A destructive action that announces itself in place, beside the thing it will destroy, is as clear as a modal and costs no dependency. **Use this pattern for the next destructive action rather than reaching for `alert-dialog`.**
**The icon is dropped in the armed state.** A document icon beside "Replace my resume" reads as reassurance the action has not earned.
Cancel is an explicit control rather than click-away — there is no overlay to click away from, so without it the armed state has no visible exit.
`isGenerating` folds into the card's shared `isBusy`, so generation, upload and extraction cannot race each other, and the dropzone stops accepting drops while a generation is in flight.
`setUploadedName(null)` runs alongside `router.refresh()` on success: the filename in client state describes the file that was just replaced.

---

### ProfileEditor — transparent state carrier

File: `components/profile/ProfileEditor.tsx`
Last updated: 2026-07-31

The project's first component that exists **only to carry state between two siblings** and renders no markup of its own. Registered because that is precisely what makes it easy to break.

| Property         | Class                                                          |
| ---------------- | -------------------------------------------------------------- |
| Background       | none — renders no element                                      |
| Border           | none                                                            |
| Border radius    | none                                                            |
| Text — primary   | none                                                            |
| Text — secondary | none                                                            |
| Spacing          | none — **inherited from the parent's `flex flex-col gap-6`**    |
| Hover state      | none                                                            |
| Shadow           | none                                                            |
| Accent usage     | none                                                            |

**Pattern notes:**
**A transparent wrapper returns a fragment, never a `<div>`.** `app/profile/page.tsx` stacks its sections with `flex flex-col gap-6`. An element here would make the resume card and the form a single flex child, and the 24px between them would disappear — a spacing regression with no visible cause in either component's own classes. Any future component introduced purely to share state between siblings must do the same.
It owns one piece of state and no styling. Presentational children that take no part in the shared state stay outside it — `CompletionIndicator` remains on the page as a Server Component rather than being pulled into the client bundle for symmetry.
Nothing visual should ever be added here. The moment this component needs a class, the layout decision has moved into the wrong file.

---

### Generated resume PDF

File: `lib/resume-pdf.tsx`
Last updated: 2026-07-31

**The only surface in this project that is not the web app**, and the only one Tailwind and `ui-tokens.md` cannot reach. A PDF resolves no CSS variables and no utility classes, so everything here is a literal in a `StyleSheet.create` object. It still has to look like JobMax made it.

| Property | Value |
| --- | --- |
| Page | A4, `paddingTop/Bottom 40`, `paddingLeft/Right 48` |
| Font | `Helvetica` (built in — no `Font.register`, no network fetch at render) |
| Text — primary | `#101828` (copy of `--color-text-primary`) |
| Text — secondary | `#6a7282` (copy of `--color-text-secondary`) |
| Accent | `#7c5cfc` (copy of `--color-accent`) — section headings and links only |
| Name | `fontSize 22`, `fontWeight bold` |
| Section heading | `fontSize 10`, `bold`, accent, `marginTop 18`, `marginBottom 7` |
| Role title | `fontSize 11`, `bold` |
| Body / bullets | `fontSize 10`, `lineHeight 1.55` (bullets `1.5`) |
| Dates / contact | `fontSize 9`–`9.5`, secondary |
| Separator | `  •  ` (two spaces either side), never a border |

**Pattern notes:**
**Three hex literals, and they are copies rather than choices.** Named against the token they mirror in a comment at the top of the file. They do **not** update themselves — if `ui-tokens.md` changes and the generated resume matters, change it here in the same commit. This file is the single sanctioned exception to the no-hardcoded-hex rule in `AGENTS.md`; nothing else may claim it.
**Only the CSS properties `library-docs.md` lists are supported.** Anything else is silently ignored by the renderer — no warning, no error, just a layout that does not match the code. Borders and `letterSpacing` are absent for that reason; separation comes from `margin` and `fontWeight`, and the `•` separator stands in for rules.
**The page budget is a layout constant, not a prompt detail.** `MAX_SUMMARY_CHARS` 400, `MAX_BULLETS_PER_ROLE` 4, `MAX_BULLET_CHARS` 160, 20 skills — exported from this file because the *page* decides how much fits. The prompt asks Gemini for those numbers and the document re-applies them, so a model ignoring the instruction still cannot spill onto page two. Verified: three roles, ten skills, summary, links and education render on exactly one page.
**Accent is used sparingly on purpose.** Section headings and the links line only. A resume goes to employers; the brand signals the document was designed, it does not decorate it.
**Every section is conditional.** Summary, experience, skills and education each render only with content, so a thin profile produces a short clean page rather than empty headings.

---

### Search controls card

File: `components/find-jobs/SearchControls.tsx`
Last updated: 2026-08-02

The Find Jobs page's top card — two fields, the accent action, and the result banner beneath them. First page in the project whose primary control is a search rather than a save, and the first whose action is a `fetch` that can take fifteen seconds.

| Property | Class |
| --- | --- |
| Card | `rounded-2xl border border-border bg-surface p-6` + card shadow |
| Field row | `grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end` |
| Label | `field-label` utility, control at `mt-2` |
| Leading icon | `pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted`, input gets `pl-9` |
| Submit | `<Button type="submit" className="h-10 gap-2 px-4">` with a `Search` icon — **the project's one hand-rolled button geometry** |
| Pending label | `Searching…`, with `disabled` — icon stays |
| Pending fields | both `Input`s take `disabled={isSearching}` |
| Banner (success) | `mt-4 flex items-center gap-2 rounded-md bg-success-lightest px-4 py-3 text-sm leading-5 text-success-dark`, `Sparkles` icon |
| Banner (error) | same box, `bg-accent-muted text-text-dark`, `AlertCircle` in `text-error` |

**Pattern notes:**
**The icon stays through the pending swap.** Every other pending label in the project drops to text alone (`Saving…`, `Generating…`, `Extracting…`) because those buttons are full-width or in a strip. This one sits in a field row at a fixed height, and removing the icon shifts the label — so `Search` stays and only the words change. **The rule: swap the label, keep the geometry.**
**The fields disable too, not just the button.** A search that takes fifteen seconds is long enough to retype the query in, and the request already carries the old value. `ResumeUpload`'s `isBusy` does the same for the same reason.
**One banner, four sentences.** The design supplies one — "Found 8 jobs and saved 4 strong matches." The other three exist because each is a genuinely different outcome: nothing came back, nothing was *new* (the dedupe), or the jobs arrived unscored because the model was busy. A single "success" sentence would have made all four look identical. **Any status line built from server counts needs its zero and its degraded cases written before it ships** — the same lesson `CompletionIndicator` learned by shipping only its failure state.
**The banner is one element in two tints, not two components.** Both carry `role="status"` and the same geometry, so a failure does not change the page's shape — only its colour and glyph. The error tint reuses the login page's inline banner treatment (`bg-accent-muted` + `AlertCircle text-error`), which is the project's error box; the success tint is the design's green.
**The inputs are the standard `Input` primitive**, `h-10 rounded-md bg-surface-secondary`, not a taller search-specific control. The design draws them slightly larger; a second input treatment beside the profile page's is a worse trade than a few pixels.
**The submit button carries no `size` variant and overrides the default's height, gap and padding by hand** — `h-10 gap-2 px-4`, which is `size="cta"` plus 4px of height. A sweep found it is the **only** hand-rolled button geometry in the project; every other button in every other component takes a variant. The reason is real: the row is `lg:items-end`, so a `size="cta"` button beside an `h-10` `Input` sits 4px short and the mismatch is obvious. **The rule this sets: a button that sits inside a field row matches the field height.** The second time this is needed, add a size variant to `button.tsx` rather than a second override.
Only the job-title field carries the magnifier — the location field has none, per the design.
`noValidate`, like every form in this project. See `progress-tracker.md § Feature 06`.

---

### Filter bar

File: `components/find-jobs/JobFilters.tsx`
Last updated: 2026-07-31

A control strip, not a form: a borderless text input and two selects that write straight to the URL.

| Property | Class |
| --- | --- |
| Card | `rounded-2xl border border-border bg-surface p-3` + card shadow, `flex flex-col gap-3 sm:flex-row sm:items-center` |
| Text input | `border-transparent bg-transparent pl-9` — the primitive with its surface removed |
| Divider | `hidden h-6 w-px bg-border sm:block`, `aria-hidden` |
| Select trigger | `w-full bg-surface sm:w-[160px]` — white, not `surface-secondary` |

**Pattern notes:**
**A control that sits directly on the card loses its border and background, not its focus ring.** The text input keeps `focus-visible:border-accent focus-visible:ring-1` from the primitive; only the resting surface is stripped. It carries an `aria-label` because it has no visible label — the placeholder is not one.
**Select triggers are `bg-surface` here**, the one place in the project they are not `bg-surface-secondary`: they sit on a card beside a transparent input rather than inside a form, and the grey would read as a filled field.
This is the project's first **URL-state** component. It takes the parsed query as a prop instead of calling `useSearchParams()` — the server already parsed it. Selects `push`; the text input `replace`s on a 300ms debounce, so a keystroke does not add a history entry. Both pass `{ scroll: false }`.
**Trim on both sides or the effect never settles.** `parseJobQuery()` trims `q`, so the debounce must compare and navigate the *trimmed* value — otherwise a trailing space makes the input's value permanently unequal to the parsed one and the effect re-fires forever. Any future URL-state control needs `parse(href(x)) === x`.

---

### Jobs table

File: `components/find-jobs/JobsTable.tsx`
Last updated: 2026-08-02

The real table `JobsTablePreview` was the reference for. Same grid technique, app body scale, five columns, whole-row links.

| Property | Class |
| --- | --- |
| Card | `overflow-hidden rounded-2xl border border-border bg-surface` + card shadow — **no padding**, rows carry it |
| Scroll | `overflow-x-auto` on the card, `min-w-[840px]` on the inner block |
| Columns | `grid grid-cols-[1.4fr_1.9fr_1.1fr_1.1fr_1fr] items-center gap-4 px-6 py-4` — one const shared by header and rows |
| Header | `border-b border-border bg-surface-secondary py-3`, labels `text-xs leading-4 font-medium tracking-wider text-text-secondary uppercase` |
| Row | `<Link>` + `border-b border-border transition-colors last:border-b-0 hover:bg-surface-secondary` |
| Company mark | `size-8 rounded-md border border-border bg-surface-secondary`, `Building2 size-4 text-text-muted` |
| Company name | `truncate text-sm leading-5 font-semibold text-text-primary` |
| Match bar | track `h-1 w-full max-w-[120px] rounded-full bg-border-light`, fill `matchScoreBarClass(score)`, width by inline style |
| Empty state | `px-6 py-12 text-center`, `size-10 rounded-full bg-accent-muted` medallion, body `text-sm leading-5 text-text-muted` |
| Failure state | same `CENTRED` box and medallion, `AlertCircle` in `text-error`, body `text-text-secondary` |

**Pattern notes:**
**Three states, not two — a failed read is not an empty one.** Added in Feature 10, when the table started reading a real table instead of an array that could not fail. Rendering "No jobs yet" while the database is unreachable tells the user their jobs are gone and invites them to search again to fix something that is not their problem. The copy says nothing was lost, exactly as `ProfileLoadError`'s does, and the colour rule is the one already recorded below: empty is `text-text-muted`, failed is `text-text-secondary`. **Whenever a component's data source becomes fallible, its empty state needs splitting.**
**Whole-row navigation makes the row a `<Link>`, so the table is a grid rather than a `<table>`.** A `<tr>` cannot be a link without a stretched-link overlay, which breaks text selection and hover. The grid is `JobsTablePreview`'s, one step up the type scale (`text-sm leading-5` — app surface, per the two-tier body rule above).
**One `COLUMNS` const for the header and every row.** Two copies is how a column drifts out of alignment with its own label.
**The card carries no padding and `overflow-hidden`.** The header's grey and the row hover both run edge to edge, and the rounded corners clip them.
**Two empty states, and they must not collapse into one.** `hasAnyJobs` distinguishes "nothing has ever been found" (`Search`, no CTA — the search card above *is* the next action) from "nothing matches these filters" (`SearchX`, plus a Clear filters button). Copy is `text-text-muted` per `ui-rules.md § Empty States`; a *failure* state would use `text-text-secondary` like `ProfileLoadError`. The `px-6 py-12` centring is the same in both.
**Null columns render, they do not disappear.** No salary is `—`; no score is the words "Not scored" with no bar, because a 0%-wide bar reads as a genuine zero.

---

### Pagination footer

File: `components/find-jobs/JobsPagination.tsx`
Last updated: 2026-07-31

The last row inside the jobs card: count and attribution left, pager right.

| Property | Class |
| --- | --- |
| Row | `flex flex-col gap-4 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between` |
| Count | `text-sm leading-5 text-text-secondary`, numbers `font-medium text-text-primary` |
| Credit | `text-text-muted`, ` &middot; Jobs by Adzuna` inline after the count |
| Step (base) | `<Button variant="outline" size="lg" className="px-3">` — the project's secondary button, widened from `px-2.5` |
| Step (current) | same button + `border-accent bg-accent-muted text-accent`, `aria-current="page"` |
| Step (link) | `asChild` wrapping a `<Link>` |
| Step (disabled) | the same `Button`, `disabled` — a real button, never an anchor |
| Gap | `px-1 text-sm leading-5 text-text-muted`, `aria-hidden` |

**Pattern notes:**
**Every step is the `Button` primitive, not a hand-rolled bordered box.** It was built as one and corrected by `/imprint`: the pager steps looked exactly like small secondary buttons, and the Button entry above is explicit that `variant="outline"` **is** the project's secondary button and a second one must not be built. `size="lg"` (h-9) is the closest to the design's step height; only the horizontal padding is overridden. Going through the primitive also picks up the focus ring and the 1% hover zoom for free — check any future "it's just a small bordered box" against this entry first.
**Previous and Next at the ends are `<Button disabled>`, not styled anchors** — the same rule as the Download button. An `<a>` with no `href` is not a link and `pointer-events-none` lies to assistive technology.
**"Jobs by Adzuna" lives here**, which is how the attribution `project-overview.md` requires is satisfied without a constant-valued SOURCE column in the table. It is deliberately quiet — `text-text-muted`, inline after the count.
The pager is hidden entirely at one page; the count line always shows. Page numbers window around the current page with an `&hellip;` marker (1 2 3 … 8), so the row cannot grow with the result set.
Every step link is built by `jobsHref()` in `lib/jobs.ts`, so `q`, `match` and `sort` survive a page change by construction rather than by each call site remembering to carry them.

---

### Job details page

Files: `app/find-jobs/[id]/{page,loading,not-found}.tsx`, `components/job-details/*`
Last updated: 2026-08-03

Seven stacked cards in a 940px column. Source: `context/design/job-details.png`.

| Property | Class |
| --- | --- |
| Column | `mx-auto flex max-w-[940px] flex-col gap-6` inside `flex-1 bg-background px-6 py-8` |
| Back link | `inline-flex w-fit items-center gap-1 text-sm leading-5 font-medium text-text-secondary transition-colors hover:text-text-primary` + `ChevronLeft size-4` |
| Page h1 | `text-2xl leading-tight font-bold tracking-tight text-text-primary` |
| Company mark (large) | `size-12 rounded-xl border border-border bg-surface-secondary`, `Building2 size-5 text-text-muted` |
| Match pill | `rounded-full px-2 py-0.5 text-[10px] leading-4 font-medium` + `matchScoreBadgeClass(score)` |
| Match pill (unscored) | same badge + `bg-surface-secondary text-text-secondary`, reading "Not scored" |
| Stat tile | `flex items-center gap-3 rounded-2xl border border-border bg-surface p-4` + card shadow |
| Tile medallion | `size-8 rounded-lg` + one of `bg-success-lightest text-success` / `bg-info-lightest text-info-dark` / `bg-accent-muted text-accent` / `bg-surface-secondary text-text-muted`, icon `size-4` |
| Tile value | `block truncate text-sm leading-5 font-semibold text-text-primary`; `title` attribute on Location only |
| Tile label | `block text-xs leading-4 tracking-wider text-text-muted uppercase` |
| Section micro-label | `text-xs leading-4 font-semibold tracking-wider text-text-secondary uppercase` |
| Section heading | `text-base leading-6 font-semibold text-text-primary` + a `size-8 rounded-lg` medallion |
| Skill chip | `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-4 font-medium`, icon `size-3` |
| Skill chip (have) | + `bg-success-lightest text-success-foreground`, `Check` |
| Skill chip (gap) | + `bg-accent-muted text-accent`, `X` |
| Card header w/ action | `flex flex-wrap items-center justify-between gap-4 border-b border-border p-6` on an `overflow-hidden` card |
| Apply button | `<Button size="xl" className="w-full">` |
| Skeleton block | `rounded-md bg-border-light` inside an `animate-pulse` column |
| Dossier chip (Feature 13) | skill-chip geometry + `bg-surface-secondary text-text-secondary` — neutral on purpose, see notes |
| Dossier bullets | `list-disc pl-4 marker:text-text-muted`, items `text-sm leading-5 text-text-secondary`; Your Edge items `text-text-primary` |
| Dossier source link | `text-xs leading-4 break-all text-text-muted underline-offset-2 hover:underline` + `target="_blank" rel="noopener noreferrer"` |
| Research status line | right-aligned under the button: pending `text-xs leading-4 text-text-muted`; error same + `text-error` with `AlertCircle size-3`; notice `text-text-secondary` |

**Pattern notes:**
**The match pill uses a different scale from the match bar, and that is not a bug to fix.** `matchScoreBarClass` implements `ui-rules.md § Match Score Bar` (≥80 green, ≥60 blue, <60 orange); `matchScoreBadgeClass` implements `ui-tokens.md § Score Indicators` (≥90 / ≥70 green at two tints, ≥50 orange, else muted). They colour different elements — the bar turns blue at 60 and the pill never does. Both live in `lib/utils.ts` with a comment saying so.
**Two uppercase micro-labels appear on this page and neither is the accent eyebrow.** AI Match Reasoning and Required Skills use the `text-text-secondary tracking-wider` label, matching the design; the accent `tracking-widest` eyebrow stays reserved for marketing sections. Job Description and Company Research are normal-case section headings instead, because that is what the mock shows — an uppercase micro-label and a section heading are not interchangeable.
**A stat tile is `p-4`, not the `p-6` content card.** Four small tiles in a row at `p-6` are taller than the content they hold. This is the second sanctioned card padding after the `p-3` control strip.
**Every section that can be empty has an empty state, and none of them hide.** An unscored job — 10 rows in the database are exactly that — keeps its pill ("Not scored"), its Match Reasoning card and its Skills card, each with one muted line. Hiding cards would make the page change shape between jobs with no explanation. Inside Skills, the two groups hide *individually*: a perfect match has no gap skills, and a "Gap skills" heading over nothing reads as a bug.
**Null tiles render a dash rather than collapsing**, the same rule the jobs table follows, so the four tiles keep their positions whichever job is open. Location truncates and carries its full text in `title` — the design mock itself shows it clipped.
**AI-produced lists dedupe at render.** `SkillsComparison` wraps both skill arrays in `Array.from(new Set(...))` because Gemini can emit the same string twice and the string is the React key. Any future component rendering a model-produced array as chips or rows — Feature 13's dossier lists included — dedupes the same way rather than trusting the agent's output to be unique.
**External links are guaranteed http(s) by the schema, not by the component.** `JobHeader` and `JobActions` render `external_apply_url` straight into `href` (always `target="_blank" rel="noopener noreferrer"`) because `jobDetailSchema` scheme-guards it — a non-http(s) value degrades to `null` and hits the existing disabled-button branch. Any future externally-sourced URL that becomes a link — a dossier's company website, a manual import — gets the same guard at its schema, never ad-hoc validation in the component. Feature 13 applied exactly this to the dossier's `sources`: sanitized at save time in `agent/research.ts` (the visited pages override the model's citations, which can be hallucinated) and guarded again on read.
**The dossier card (Feature 13): nine sections from a config array, not nine components.** `CompanyResearch` stays a server component driving `paragraph`/`chips`/`bullets`/`links` shapes from a typed array — `code-standards.md` is one component per file. Every list dedupes at render per the rule above. Each empty section hides individually (the SkillsComparison rule); the two paragraphs are always present, so the card never collapses. **Dossier chips are neutral** (`bg-surface-secondary`), deliberately not the green/red of skill chips: skill chips render judgments, the tech stack renders facts — the same reasoning that keeps select triggers grey only inside forms. Your Edge alone carries `text-text-primary`, the dossier's centrepiece.
**`ResearchButton` is the page's agent trigger** — the SearchControls fetch pattern (pending state, typed response, `!response.ok || !result.success`, `router.refresh()` in `finally`) with a right-aligned status *line* instead of a banner, because it lives in a card header, not a form. The pending line says "Takes a minute or two." — the one fetch in the app that legitimately runs that long, and a silent spinner reads as a hang. A synthesis-only dossier (`browsed: false`) surfaces as a notice line — the Feature 08 degrade-and-admit rule: never deliver less than the button promised silently.
**A trigger that starts an expensive run needs a synchronous re-entry guard, not just `disabled`.** Verified live on this button: a double-click's second event lands before React commits the disabled re-render, and one click started two full agent runs. `ResearchButton` pairs the state (drives the label) with a `useRef` in-flight flag (drives re-entry — refs flip synchronously). `SearchControls` has the same exposure and does not have the guard yet; any future button whose click costs money or a mutation race should copy this pair.
**`size="xl"` (h-12) was added to `button.tsx` rather than hand-rolled at the call site**, per the Button entry's rule that a new geometry is a new size variant.
**Not-found and read-failure are different pages.** `not-found.tsx` uses the empty-state medallion (`SearchX` in `text-accent`) and says the job is not in your list; `JobLoadError` uses the failure medallion (`AlertCircle` in `text-error`) and says nothing was lost. Collapsing them would tell someone with a stale link that the system broke. See the JobsTable entry for the same three-state rule. Both headings are `h1` — when either renders, `JobHeader`'s h1 does not, so each is the only heading its page has.
**`loading.tsx` is the first in the project.** Opening a job is a click that waits on a database read, and without it the row click reads as dead. The skeleton mirrors the real layout's rhythm so nothing jumps when content arrives, is `aria-hidden`, and carries one `role="status"` line for screen readers. **The list page's filter/sort/pagination navigation still has no equivalent** — that finding is still open.

---

### Dashboard page

Files: `app/dashboard/page.tsx`, `components/dashboard/*`
Last updated: 2026-08-03

Source: `context/design/dashboard.png`. Stats and charts render mock data from `lib/dashboard-mock.ts` until Features 15/16/17; the incomplete-profile banner is real.

| Property | Class |
| --- | --- |
| Column | `mx-auto flex max-w-[1440px] flex-col gap-6` inside `flex-1 bg-background px-6 py-8` — the wide app column; job details keeps its 940px one |
| Stat card | card recipe `p-6`; label `text-sm leading-5 font-medium text-text-secondary`; value `text-3xl leading-9 font-semibold text-text-primary`; caption `text-xs leading-4 text-text-muted` |
| Trend badge | `rounded-sm bg-success-lightest px-2 py-0.5 text-xs leading-4 font-medium text-success-darker` — the ui-tokens trend badge, `rounded-sm` not pill |
| Stats grid | `grid gap-6 sm:grid-cols-2 xl:grid-cols-4` |
| Chart rows | `grid gap-6 lg:grid-cols-[2fr_3fr]` (activity + research) and `lg:grid-cols-[3fr_2fr]` (line + distribution) |
| Activity dot | outer `size-4 rounded-full` tint wrapping inner `size-2 rounded-full` — search `bg-success-light`/`bg-success-alt`, research `bg-info-light`/`bg-info` |
| Activity connector | `mt-1 w-px flex-1 bg-border` under every dot except the last; text rows carry `pb-5` except the last |
| Activity text | `text-sm leading-5 font-medium text-text-primary` + `mt-0.5 text-xs leading-4 text-text-muted` timestamp |
| List card header | `border-b border-border p-6` on an `overflow-hidden` card — the job-details card-header pattern without the action slot |
| Chart card | card recipe `p-6`; section heading; `mt-4 h-[280px]` wrapper (ResponsiveContainer measures 0 in an unsized parent) |
| Chart colors | line `var(--color-accent)` 3px + gradient fill 0.25→0; research bars `var(--color-info)`; match bars `var(--color-success)`; grid dashed `var(--color-border)`; axis ticks `var(--color-chart-axis)` 12px; bar `radius={[4,4,0,0]}` `maxBarSize={40}` |
| Banner | `flex flex-wrap items-center gap-4` card at `p-4` (tile padding); failure medallion (`size-10 rounded-full bg-accent-muted` + `AlertCircle size-5 text-error`); CTA `Button asChild variant="outline" size="cta"` |

**Pattern notes:**
**Charts are the second sanctioned non-Tailwind styling surface**, after the match-bar inline width: recharts styling rides on component/SVG props, so every colour is a `var(--color-*)` reference and the no-hex rule holds. `library-docs.md § Recharts` is the contract; do not hand a recharts prop a hex literal.
**`--color-chart-axis` exists only for charts.** ui-tokens.md specifies `#9CA3AF` axis labels, which is *not* `text-muted` (`#99A1AF`) — the two look interchangeable and are not; do not "fix" one into the other.
**Three chart components, not one `AnalyticsCharts.tsx`.** The mock interleaves charts with the activity card across two grid rows, so no single wrapper can own the layout — and one component per file stands. Recorded in the tracker as a deviation from `architecture.md`'s component list, same shape as Feature 12's `MatchScore` split.
**Activity dot colours key off the entry type, never the mock's pixels.** The mock's purple dots belong to out-of-scope activity kinds (resume tailoring); the two real kinds follow Feature 16's rule — search = success, research = info.
**Single-series charts carry no legend** — the card heading names the series (the dataviz rule; the design agrees). Hover tooltips are styled with the same tokens (`surface`/`border`/12px) so the chart's one interactive layer stays inside the system.
**The banner guards itself** (`missingFields.length === 0` → `null`), so the page composes it unconditionally and the mock's bannerless layout is the complete-profile rendering, not a separate branch.
**Chart Y-axes are never given a fixed `domain`** (post-review). A hardcoded `[0,100]` clips any larger value silently; recharts' nice-tick auto-scale reproduces the design's 0/25/50/75/100 for data topping out under 100 and rescales beyond it. The page also carries an `sr-only` h1 (the find-jobs precedent) and `app/dashboard/loading.tsx`, a skeleton mirroring this grid.

---

### Profile page shell / app header — RETIRED

File: `app/profile/page.tsx`
Last updated: 2026-07-30

> **Retired.** This described the placeholder page that stood in for `/profile` between Features 02 and 05. Feature 05 replaced the body with `CompletionIndicator` + `ResumeUpload` + `ProfileForm`, and the minimal logo-and-logout header with `components/layout/AppNavbar.tsx` — see that entry instead. Feature 06 then removed the last of the mock data. Kept only so the classes below are not silently lost; do not build anything new from this section.

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
The header was a **minimal app header**, deliberately not the full app navbar: logo left, logout right, no nav links. `AppNavbar` superseded it in Feature 05, earlier than the Feature 14 originally predicted below.
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
