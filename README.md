# Мой спортзал

Персональный офлайн-дневник силовых тренировок для RuStore (Android first).

## Project

**Мой спортзал**

## Core principle

`Предыдущий результат → подход за 1–3 касания → отдых`

Приложение не является социальной сетью, AI-тренером или энциклопедией фитнеса.

## Paths

Remote Cursor:

`D:\PetProject\myFitnesRuStore`

Local Codex:

`D:\petProject\myFitnesRuStore`

GitHub:

`https://github.com/alex1c/myFitnesRuStore`

GitHub — point of truth between machines.

## Development workflow

Cursor выполняет основную разработку.

Codex используется только на ключевых checkpoints.

Не писать сюда секреты, ключи, пароли и production advertising IDs.

## Stack (Phase 0)

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript strict
- Expo Router
- SQLite (`expo-sqlite`)
- Jest
- ESLint
- Android first / offline-first

## Scripts

```bash
npm start
npm run android
npm test
npm run lint
npm run typecheck
```

## Phase 0

Foundation: navigation, design tokens, SQLite migrations, repositories, decimal utility, tests.

## Phase 1

Exercise library:

- built-in catalog (**139** exercises, Russian names)
- search + muscle filters
- custom create / edit
- per-exercise rest, weight step, notes
- archive / restore for custom exercises
- user settings for built-ins survive re-seed (`exercise_user_settings`)

Not in Phase 1: active workouts, set logging, rest countdown, history charts, ads, cloud, AI.

## Phase 2

Workout templates:

- create / edit / duplicate / archive / restore
- add exercises from library with search/filters
- planned sets, reps range, per-exercise rest override
- reorder (up/down)
- Today screen as template launcher (no active workout yet)

Not in Phase 2: starting a workout, set logging, rest timer, notifications.

## Phase 3

Active workout logging:

- start from template / quick workout
- single active workout + resume after app kill
- compact set logging with one-tap ✓
- previous results by exercise id
- auto-fill weight/reps (decimal comma)
- tracking types + set types
- add / replace / remove / reorder exercises mid-workout
- finish → summary → history list/detail
- discard with confirmation

Not in Phase 3: rest countdown timer, notifications, PR/e1RM/tonnage, ads.

## Phase 4

Rest timer:

- automatic start after successful set completion
- absolute `rest_ends_at` persistence (background / process-kill safe)
- restore on app reopen + stale cleanup
- −15 / +15 / skip controls
- Android local notifications via `expo-notifications` (`rest-timer` channel)
- notification permission asked in context of first rest use
- workout exercise `rest_seconds` snapshot (template independence)

Native Android device/emulator notification QA is a separate checkpoint — not claimed as PASS from unit tests alone.

Not in Phase 4: progress charts, PR, ads, analytics, AI.

## Phase 5

Workout history:

- finished workouts list (newest first, FlatList)
- Russian dates (Сегодня / Вчера / 5 сентября)
- history detail with completed sets only
- tracking-type display + set-type labels
- workout notes + exercise notes
- edit completed sets (preserves `completed_at`)
- delete finished workout with confirmation
- **Повторить тренировку** → new active workout from historical snapshot

`Native timer notification QA pending` (Phase 4 Android runtime still not verified).

Not in Phase 5: PR / e1RM / charts / backup / ads.

## Phase 6

Progress & personal records:

- overall summary (30 / 90 / 180 / all)
- exercise list with completed history
- weight / e1RM / volume metrics and charts (`react-native-svg`)
- tracking-type-specific metrics (reps, duration, distance)
- live PR feedback after completed sets (derived from history)
- workout finish summary: volume + record count

`Native Android rest notification QA pending`.

Not in Phase 6: body measurements, AI coaching, ads, cloud.

## Phase 7

Data portability:

- versioned JSON backup (`my-fitness-backup` v1)
- atomic full restore (transactional replace; no merge)
- custom exercises + user settings + templates + workouts/sets
- built-in catalog from current app seed; user overrides restored on top
- CSV export of completed sets (semicolon, UTF-8 BOM) for Excel
- «Ещё» → Данные: backup / restore / CSV

`Native Android rest notification QA pending`.

Not in Phase 7: CSV import, cloud sync, body measurements, ads.

## Phase 8

UI polish & settings:

- System / Light / Dark theme (persisted in `app_meta`)
- «Ещё» as settings hub (theme + data + about)
- active workout / set row / rest timer UX polish
- accessibility labels and touch targets
- Russian copy / formatting consistency

`Native Android rest notification QA pending`.

Not in Phase 8: ads, AppMetrica, body measurements, cloud.

## Phase 9

Product analytics (AppMetrica only — no ads):

- package: `@appmetrica/react-native-analytics` **4.2.0**
- production API key configured in `src/services/analytics/config.ts`
- typed privacy-conscious events (`workout_started`, `set_completed`, …)
- custom events do **not** send workout/template/exercise names, notes, exact weight/reps, or file paths
- AppMetrica used for product analytics / crash diagnostics (SDK defaults); location tracking disabled in our activate config

`Native Android rest notification QA pending`.

Not in Phase 9: Yandex Mobile Ads, banners, interstitial.

## Phase 10

Yandex Mobile Ads monetization (safe placement):

- package: `yandex-mobile-ads` **8.4.0** (official RN plugin)
- production unit IDs in `src/services/ads/config.ts` (banner + interstitial only)
- sticky banner on Today (no active workout), History, Progress, Exercises, More
- **no banner while an active workout exists** (including Today)
- post-workout interstitial only after summary → **Готово**
- eligibility: ≥3 finished workouts in history, current workout has completed sets, max **1 interstitial per app session**
- hard guard: never show interstitial while `getActiveWorkout()` is set
- ads are best-effort (offline / load / show failures never block workouts or navigation)
- no app-open, rewarded, feed, or native ad units in 1.0
- custom workout content is **not** passed into ad targeting; location consent disabled

`Native Yandex Ads rendering QA pending`.

`Native Android rest notification QA pending`.

Privacy note: Yandex Mobile Ads is used for monetization with standard SDK data processing. Privacy policy: `docs/privacy.html`.

Not in Phase 10: release packaging, RuStore listing copy (later phases).

## Phase 11

In-app learning (offline):

- «Ещё → Помощь → Как пользоваться» — always available
- optional Today first-use card (`Первый раз здесь?`) for users with no history
- dismissible via `onboarding_help_dismissed` in `app_meta` (not in backup)
- 8 short practical lessons; no ads on the help screen; AppMetrica unchanged

Product standard: main scenarios must be explainable to a beginner inside the app. See `docs/in-app-learning-standard.md`.

Not in Phase 11: release packaging, new product features beyond the guide.

## Phase 12A

Release identity:

- production support email in «Ещё → О приложении»
- privacy policy (`docs/privacy.html`, GitHub Pages `/docs`)
- approved launcher/store icon from `assets/icon_gpt.png`
- release-artifacts scaffold (`store-icon.png`)

Not in Phase 12A: AAB signing / store upload (Phase 12B).

## Package

- App name: `Мой спортзал`
- Android package: `com.calculatorplatform.myfitness`
- Version: `1.0.0` (versionCode `1`)
- Support: `rustore-alex1c@yandex.ru`
- Privacy: `https://alex1c.github.io/myFitnesRuStore/privacy.html`
