# Design — Manuel Cabriales

## Direction

Editorial portfolio following the user’s screenshot reference (11 November 2026): warm cream paper, restrained terracotta accents, classic serif headings, fine rules and a subtle dotted background. This direction supersedes the former amber darkroom design. Keep factual content and English language from PRODUCT.md.

## Tokens

`src/styles/global.css` is the implementation source. The final token block overrides the previous palette while preserving framework imports and shared utilities.

| Role | Light | Dark |
| --- | --- | --- |
| Paper | #f7f5ee | #222320 |
| Secondary paper | #efede5 | #2c2d28 |
| Ink | #252521 | #f1eee4 |
| Muted text | #514f49 | #ccc7ba |
| Secondary text | #69665f | #b1ac9f |
| Rules | #dfdcd2 | #45463d |
| Accent | #a84027 | #e39a7e |
| Accent text | #a13b24 | #eaa88e |
| Cards | #fffefa | #2a2b26 |

## Typography

Display: Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif. Body: self-hosted Archivo at normal width. Dates and technology labels: self-hosted Martian Mono. Headings are upright and in sentence case. Main heading scales from 2.7rem to 4.4rem; body is 1rem; compact details never below 0.6875rem.

## Composition

64rem shell with fluid 1.25–3rem gutters. Quiet wordmark and text navigation. A left-aligned introductory claim and contact actions face a small geometric code emblem. Home sequence: introduction, Experience, Stack, Writing, Selected work, Contact. Pale section numerals reproduce the reference’s visual organization. Work remains linked to the existing case-study routes; published posts remain real articles rather than placeholders.

Experience uses a date column beside the company, position, summary, outcomes and technology labels. Stack groups remain labeled. Article cards use a paper surface and a thin border. Contact is compact with email and verified social links.

## Responsive behavior

At 40rem, the navigation links form a second row, the code emblem disappears, and experience, stack groups and contact stack vertically. Article grids use minmax(0, 1fr) tracks via an auto-fit minimum. Root overflow uses clip. Buttons and navigation labels stay on one line.

## Interaction and accessibility

Preserve working theme toggle, pre-paint theme resolution, skip link and visible focus rings. Links change accent or underline on hover. Primary actions have a 44px minimum height. No decorative entrance animation. Existing reduced-motion support remains. Availability comes from AVAILABILITY, and factual claims come from existing data.

## Scope

Home and shared shell are redesigned. Article and case-study layouts inherit the new palette and serif display tokens; their specialized structures remain. Existing favicon and OG raster assets have not been regenerated in this change.

## Validation

Production build and Astro diagnostics pass. Browser rendering could not be inspected because no browser connection is available in this session. Responsive rules were checked in source; viewport and interactive visual verification remains pending.
