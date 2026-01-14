# AI Agent Guidelines

## Database Safety

- **CRITICAL**: BEFORE running any database migration or reset command, YOU MUST VERIFY if it will cause data loss.
- **ALWAYS** prefer `npx prisma db push` for development schema updates.
- **NEVER** use `scripts/reset-db-local-safe.sh` or `prisma migrate reset` unless the user has EXPLICITLY requested a "wipe", "reset", or "clean start" with knowledge of data loss.
- If a command fails and suggests a reset, **STOP** and ask the user.

## Code Style & Conventions

- Stack: Next.js (App Router), React, TailwindCSS, Prisma.
- Language: TypeScript.
- strict mode is enabled.
