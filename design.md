# design.md — PRODEAR

## Overview

PRODEAR is a modern social football prediction platform ("prode") designed for:
- Offices.
- Groups of friends.
- Young communities.
- Casual competitive environments.

The product should feel:
- Modern.
- Fast.
- Premium.
- Clean.
- Social.
- Competitive.

It should NOT feel like:
- A gambling platform.
- A crypto product.
- A childish sports app.
- A loud gaming UI.

The visual identity combines:
- SaaS dashboards.
- Fantasy sports products.
- Modern fintech aesthetics.
- Classic football prediction culture.

---

# Brand Personality

## Keywords
- Smart.
- Competitive.
- Friendly.
- Social.
- Fast.
- Clean.
- Minimal.
- Premium.
- Youthful but mature.

## Tone of Voice
Use concise, modern, friendly language.

Examples:
- "You climbed 3 spots."
- "Predictions close in 10 minutes."
- "Juan leads the standings."
- "Big upset or safe pick?"

Avoid:
- Gambling terminology.
- Aggressive marketing copy.
- Overly corporate language.
- Excessive football slang.

---

# Naming

## Product Name
# PRODEAR

The name should always be written in uppercase in the logo and hero sections.

---

# Core UX Principles

## 1. Mobile First
The app is primarily used:
- During matches.
- Inside WhatsApp groups.
- During office breaks.
- In quick sessions.

All flows must work perfectly on mobile.

---

## 2. Fast Interactions
Users should:
- Create predictions quickly.
- Understand standings instantly.
- Navigate without friction.

Avoid unnecessary confirmations and modal overload.

---

## 3. Shareability
Standings and rankings should look good in screenshots.

UI should encourage:
- Sharing.
- Competition.
- Banter.
- Social interaction.

---

## 4. Data Clarity
Standings and fixtures are the core of the product.

Prioritize:
- Readability.
- Hierarchy.
- Spacing.
- Scannability.

---

# Design Direction

## General Style
The interface should combine:
- Modern SaaS.
- Sports dashboards.
- Fantasy league products.
- Minimal fintech UI.

Visual references:
- Linear.
- Notion.
- Sofascore.
- FotMob.
- Splitwise.

---

# Color System

## Primary Colors

### Background
```css
#121417
```

Main dark background.

---

### Foreground
```css
#F5F7FA
```

Primary text and light surfaces.

---

### Accent / Primary Action
```css
#6CFF7D
```

Use for:
- Primary buttons.
- Success states.
- Selected predictions.
- Highlights.

---

## Secondary Colors

### Card Background
```css
#23272F
```

---

### Borders / Dividers
```css
#D8DEE8
```

---

### Warning
```css
#FF9F43
```

Use for:
- Deadlines.
- Match lock warnings.
- Pending states.

---

### Ranking Gold
```css
#FFC857
```

Use for:
- 1st place.
- Trophies.
- Achievements.

---

# Typography

## Primary Font
# Inter

Use for:
- UI.
- Body text.
- Tables.
- Inputs.
- Navigation.

---

## Secondary Font
# Space Grotesk

Use for:
- Hero titles.
- Rankings.
- Big numbers.
- Marketing sections.

---

# Layout System

## Border Radius
Use generous rounded corners.

Recommended:
```css
border-radius: 16px;
```

---

## Shadows
Soft shadows only.

Avoid:
- Heavy neumorphism.
- Sharp hard shadows.
- Overly colorful glows.

---

## Spacing
Use spacious layouts.

The UI should breathe.

Avoid cramped sports-betting layouts.

---

# Components

## Buttons

### Primary Button
Style:
- Bright green background.
- Dark text.
- Medium-large padding.
- Rounded.
- Bold typography.

Should feel:
- Clickable.
- Modern.
- Fast.

---

### Secondary Button
Style:
- Transparent background.
- Light border.
- Subtle hover.

---

## Inputs
Style:
- Minimal.
- Clean.
- Large hit area.
- Subtle focus glow.

Avoid heavy outlines.

---

## Cards
Cards are the primary layout primitive.

Use for:
- Fixtures.
- Rankings.
- Match predictions.
- Statistics.
- User groups.

Style:
- Dark elevated background.
- Rounded corners.
- Subtle separation.
- Minimal borders.

---

# Standings Table

## This is the most important component.

The standings table must feel:
- Competitive.
- Clear.
- Shareable.
- Modern.

Required features:
- Avatar.
- Position.
- Position movement.
- Points.
- Correct picks.
- Weekly trend.

---

## Top 3 Styling
Top positions should have subtle emphasis.

Examples:
- Gold accents.
- Slightly elevated cards.
- Small crown/trophy indicators.

Avoid excessive gamification.

---

# Motion Design

Animations should be:
- Fast.
- Smooth.
- Subtle.
- Functional.

Examples:
- Position changes.
- Prediction confirmation.
- Countdown timers.
- Live score updates.

Avoid:
- Bouncy cartoon animations.
- Excessive motion.
- Flashy transitions.

---

# Iconography

Icons should be:
- Minimal.
- Rounded.
- Clean.
- Consistent.

Use outline icons when possible.

Avoid skeuomorphic football graphics.

---

# Logo Guidelines

## Logo Concept
The logo should combine:
- A standings table.
- A checkmark.
- A fixture.
- A geometric "P".

Style:
- Flat.
- Minimal.
- Recognizable at small sizes.

---

## Logo Behavior
The logo must work in:
- Dark mode.
- Light mode.
- Square app icon.
- Social avatars.
- Mobile navbar.

---

# Imagery

## Preferred Photography
Show:
- Friends watching matches.
- Office groups.
- Casual competition.
- Shared moments.
- Modern work culture.

Avoid:
- Gambling imagery.
- Casinos.
- Aggressive sports fans.
- Betting tickets.

---

# Product Feel

The product should feel like:
- A premium internal office game.
- A modern social prediction platform.
- A startup-quality sports product.

It should NOT feel like:
- A betting site.
- A fantasy RPG.
- A generic sports news app.

---

# Suggested Tech UI Stack

## Frontend
- React.
- Next.js.
- TailwindCSS.
- Framer Motion.
- shadcn/ui.

---

## Styling Philosophy
Prefer:
- Utility-first styling.
- Reusable components.
- Design tokens.
- Consistent spacing.

Avoid:
- Inline random styles.
- Inconsistent radii.
- Excessive color variations.

---

# Suggested Design Tokens

```ts
export const theme = {
  colors: {
    background: '#121417',
    surface: '#23272F',
    foreground: '#F5F7FA',
    primary: '#6CFF7D',
    warning: '#FF9F43',
    gold: '#FFC857',
    border: '#D8DEE8'
  },
  radius: {
    md: '12px',
    lg: '16px',
    xl: '24px'
  }
}
```

---

# UX Anti-Patterns

Do NOT:
- Overuse gradients.
- Use casino aesthetics.
- Use red/green everywhere.
- Make tables visually dense.
- Use tiny typography.
- Add unnecessary modals.
- Create cluttered dashboards.

---

# Ideal Product Experience

A user should:
1. Enter the app.
2. Understand the current standings immediately.
3. Submit predictions in under 1 minute.
4. Feel socially engaged.
5. Want to share the ranking.

---

# Landing Page Direction

## Hero Section
Focus on:
- Competition.
- Groups.
- Office culture.
- Friends.
- Rankings.

Headline examples:
- "The prediction game for your group."
- "Turn every matchday into a competition."
- "Your office already has a champion."

---

# Accessibility

Must support:
- High contrast.
- Keyboard navigation.
- Clear focus states.
- Responsive typography.
- Mobile usability.

Avoid low-contrast dark gray text.

---

# Final Product Goal

PRODEAR should feel like:
- The modern version of the traditional prode.
- A polished social sports platform.
- Something people use daily during tournaments.
- A product that works equally well for friends and companies.

The most important emotional outcomes are:
- Competition.
- Group identity.
- Social interaction.
- Fast gratification.
- Friendly rivalry.
