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

## Package

- App name: `Мой спортзал`
- Android package: `com.calculatorplatform.myfitness`
- Version: `1.0.0` (versionCode `1`)
