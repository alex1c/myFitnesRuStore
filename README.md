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

## Package

- App name: `Мой спортзал`
- Android package: `com.calculatorplatform.myfitness`
- Version: `1.0.0` (versionCode `1`)
