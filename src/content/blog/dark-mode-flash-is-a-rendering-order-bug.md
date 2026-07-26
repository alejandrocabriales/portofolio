---
title: The dark mode flash is a rendering-order bug
description: Three separate faults hide behind one symptom when a theme toggle misbehaves. Only one of them is about CSS, and the fix for each is different.
published: 2026-07-26
category: Performance
tags: ['astro', 'css', 'dark-mode', 'ssr']
featured: true
draft: true
---

Every theme toggle I have written has had the same bug at least once: the page
loads light, then snaps to dark. It looks like a CSS problem. It is not. It is a
question of *when* your JavaScript runs relative to first paint — and once you
frame it that way, two more bugs usually fall out of the same code.

## The flash is about script position, not CSS

A theme toggle needs to know the theme before the browser paints anything. If
the deciding script sits at the end of `<body>`, the browser has already
painted the default theme by the time it runs.

```html
<!-- Too late. The page has already painted light. -->
<body>
  <div class="content">…</div>
  <script>
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  </script>
</body>
```

The fix is position, not technique. The script goes in `<head>`, above any
styled markup, and it must be *blocking* — a module script or one with `defer`
is deferred past paint by definition.

```html
<head>
  <script>
    const stored = localStorage.getItem('theme');
    const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle(
      'dark',
      stored === 'dark' || (!stored && prefersDark),
    );
  </script>
</head>
```

In Astro this needs `is:inline`. Without it, Astro bundles the script and serves
it as a module — which reintroduces the exact deferral you are trying to avoid.

```astro
<script is:inline>
  /* … */
</script>
```

## The second bug: storage is not state

Here is the toggle handler that ships with almost every tutorial:

```js
button.addEventListener('click', () => {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
});
```

Read it as a first-time visitor whose OS is set to dark. `localStorage` is
empty, so the head script resolved dark from the media query. The page *is*
dark. Now they click the toggle:

`localStorage.getItem('theme')` is `null`. `null !== 'dark'`, so we take the
`else` branch — and add a class that is already there.

Nothing changes. The toggle looks broken. It starts working on the second
click, which is exactly the kind of bug that gets reported as "sometimes it
doesn't work".

The cause is a category error: `localStorage` holds the user's *preference*,
which is often absent. The DOM holds the *current state*, which never is. Read
the state from the state.

```js
button.addEventListener('click', () => {
  // toggle() returns the resulting state — no branch needed
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});
```

| Question | Correct source |
| --- | --- |
| What theme is showing right now? | `documentElement.classList` |
| What did the user choose? | `localStorage` |
| What does the OS suggest? | `matchMedia` |

Conflating the first two is the bug. The head script is the only place all
three legitimately meet.

## The third bug: the icon needs no JavaScript

The same tutorials ship both icons hidden and reveal one on `DOMContentLoaded`:

```html
<svg id="sun" class="hidden">…</svg>
<svg id="moon" class="hidden">…</svg>
```

So the button renders empty until JS parses, and it flickers on every
navigation. But the information is already in the DOM — the `dark` class on
`<html>`. CSS can read it:

```css
[data-theme-state='dark'] { display: none; }
.dark [data-theme-state='dark'] { display: block; }
.dark [data-theme-state='light'] { display: none; }
```

Correct on first paint, zero JavaScript, nothing to hydrate.

This also fixes the accessible name for free. Give each state a visually hidden
label:

```html
<span data-theme-state="light">
  <svg aria-hidden="true">…</svg>
  <span class="sr-only">Switch to dark theme</span>
</span>
```

`display: none` removes an element from the accessibility tree, so exactly one
label is ever exposed. The button's name is always accurate, with no
`aria-pressed` to keep in sync and no hydration mismatch to worry about.

## Two things people forget

**`color-scheme`.** Without it, native scrollbars, form controls and
`<select>` dropdowns stay light inside your dark page.

```css
:root { color-scheme: light; }
.dark { color-scheme: dark; }
```

**The OS can change while the page is open.** Follow it only when the user has
not made an explicit choice:

```js
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('theme')) return; // user decided; respect it
  document.documentElement.classList.toggle('dark', e.matches);
});
```

## What to take from this

One visible symptom, three unrelated causes:

- The flash is a **script-position** bug — fix it in `<head>`, blocking.
- The dead first click is a **state-source** bug — read the DOM, not storage.
- The empty button is a **hydration** bug — let CSS do it instead.

Fixing only the one you noticed leaves the other two shipping. The general
lesson is worth more than the specific fix: when something renders wrong on
load, ask *when* your code runs before asking *what* it does.
