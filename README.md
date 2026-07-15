# ☄️ Armageddon Radar

> Your daily check on how close humanity is to a surprise cosmic punch.

An interactive React Native (Expo) app that tracks today's near-Earth asteroids
using NASA's [NeoWs (Near Earth Object Web Service)](https://api.nasa.gov/) Feed
API, wrapped in a high-tech, glowing "threat dashboard" UI.

## Features

- **Today's Threat gauge** — a custom semi-circular SVG gauge whose needle is
  driven by the closest asteroid's miss distance (in lunar distances). Under
  1 LD swings toward red alert; above 5 LD sits in the safe green/blue zone.
- **Cheeky verdict banner** — from _"🚨 Lock your doors."_ to
  _"🛡️ Not today, space rocks."_
- **Interactive radar** — an animated, glowing concentric radar sweep. Each
  asteroid is a blip placed radially by distance; tap one to focus it and sync
  the tracking list.
- **Active tracking cards** — velocity (km/h), diameter, and miss distance for
  every near-Earth object, plus fun human-scale size conversions
  (_"About 6 double-decker buses 🚌"_).
- **Detail sheet** — full orbital-mechanics breakdown, a
  **Set Telescope Reminder** button (schedules a local `expo-notifications`
  reminder for the closest-approach time), and a one-tap **share** widget.

## Tech stack

| Concern       | Choice                                    |
| ------------- | ----------------------------------------- |
| Framework     | React Native + Expo (SDK 57), TypeScript  |
| Styling       | Tailwind via **NativeWind** v4            |
| Data/state    | **TanStack Query** (React Query)          |
| Graphics      | `react-native-svg` (gauge + radar)        |
| Icons         | `@expo/vector-icons` (MaterialCommunity)  |
| Notifications | `expo-notifications`                      |

## Project structure

```
src/
  api/nasa.ts                – feed fetch + normalisation, dynamic date-key parse
  components/                – ThreatGauge, RadarView, AsteroidCard, VerdictBanner…
  data/                      – schema-accurate mock feed + diameter comparisons
  hooks/useNeoFeed.ts        – React Query hook (caches once per day)
  screens/                   – DashboardScreen, DetailSheet (modal)
  theme/colors.ts            – design tokens
  types/neo.ts               – NeoWs API + normalised `Asteroid` interfaces
  utils/                     – threat scaling, units, dates, geometry, notifications
```

## Getting started

> **Node:** Expo SDK 57 / React Native 0.86 require **Node ≥ 20.19.4**. Newer is
> better — on older Node the dev server may refuse to start.

```bash
npm install
npm start          # then press a for Android, or scan the QR in Expo Go
```

### NASA API key

The app defaults to NASA's shared `DEMO_KEY`, which is rate-limited to ~30
requests/hour. Grab a free key at <https://api.nasa.gov/> and pass it to
`useNeoFeed({ apiKey })`. If the live feed fails (e.g. rate limit), the error
screen offers a **Use demo data** fallback backed by the bundled mock feed.

## Notes

- Velocity is shown in **km/h** throughout (including the share text).
- Data is fetched once per calendar day and cached aggressively — the NeoWs feed
  only changes daily.
