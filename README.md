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

## Package

- App name: `Мой спортзал`
- Android package: `com.calculatorplatform.myfitness`
- Version: `1.0.0` (versionCode `1`)
