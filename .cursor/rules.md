# 🧠 Cursor AI Project Rules — 2025 Edition

## Project Stack:
- **Frontend:** Electron + React + TypeScript
- **Backend:** FastAPI (Python 3.11+)
- **Database:** PostgreSQL (SQLAlchemy + Alembic migrations)
- **Vector DB (if AI features):** Supabase / PostgreSQL + pgvector
- **Hosting:** AWS / Vercel / Render

---

## 🔝 Core Philosophy
These rules are **non-negotiable**. The AI must follow them exactly.  
They exist to enforce **clarity, maintainability, and realism** in software output.  
All code must be functional, minimal, and consistent — no over-engineering, no outdated libraries.

---

## 🧭 1. High-Level Principles

1. **KISS:** Keep It Simple and Secure — smallest, most testable viable solution.  
2. **Contract-first:** Define OpenAPI schema before writing backend routes or React API calls.  
3. **Consistency:** Same naming conventions and error handling across frontend and backend.  
4. **Justify every dependency:** Provide repo URL, latest commit date, downloads/stars, CVE status.  
5. **Limit complexity:** Default 3 files per feature (controller/service/test).  
6. **Library freshness:** Prefer packages updated within the last 12 months.  
7. **Avoid mixing APIs:** Don't mix old/new syntax or partial migrations.  
8. **Document all decisions:** Each major choice includes a short "why" paragraph.  
9. **Test every feature:** Minimum one unit test + one integration test.  
10. **Security-first:** Always use validated inputs, typed schemas (Pydantic), and auth-by-default routes.

---

## ⚙️ 2. Concrete Rules (Enforced in Cursor AI)

| Rule | Description |
|------|--------------|
| **RULE_001 – File Limit** | Max 3 files per feature: `controller.py`, `service.py`, `test_*.py`. React: `component.tsx`, `service.ts`, `test.tsx`. Justify extras. |
| **RULE_002 – Dependency Vetting** | Include npm/pip URL, version, last commit, downloads/stars, CVE status. Reject if outdated/unmaintained. |
| **RULE_003 – Library Freshness** | Must be maintained in last 12 months or replaced with stable alternative. |
| **RULE_004 – No API Mixing** | Do not mix v1/v2 FastAPI routes or React router versions. Create adapter if partial migration. |
| **RULE_005 – Contract First** | Generate OpenAPI schema first. Backend + frontend must match schema exactly. |
| **RULE_006 – Overengineering Cap** | Ban CQRS/Event Sourcing unless performance/load justification is documented. |
| **RULE_007 – Naming Consistency** | Same function names across backend and frontend. No placeholders like `foo()` or `temp()`. |
| **RULE_008 – Tests Required** | Every feature must have working unit + integration test. |
| **RULE_009 – Commit Template** | Enforce structured commit messages and "WHY" sections (see template below). |
| **RULE_010 – Justify Everything** | Any library, file, or abstraction must include a 2–4 line justification with measurable signals. |

---

## 🧩 3. Library Selection Prompt Template
> Use this whenever selecting libraries (React router, state manager, ORM, etc.)

**Prompt Template:**
```
Choose a library for <task>. Provide 3 options:

1. Safe Default
2. Modern/Opinionated
3. Lightweight

For each:
* Package name + version
* Pros (1 line)
* Cons (1 line)
* Maintenance metrics (last commit date, stars/downloads)
* CVE status
* 1-line fallback plan

End by recommending exactly one option with 2-line justification.
```

---

## 🏗️ 4. Canonical Project Structure (Electron + React + FastAPI)

```
/project-root
/apps
  /desktop-electron
    /src
      main.ts                 # Electron main process
      preload.ts
      index.html
    /renderer
      index.tsx             # React root
      /routes
        AppRoutes.tsx
      /components
        Header.tsx
        Footer.tsx
      /features
        /auth
          Auth.tsx
          auth.service.ts
          auth.test.tsx
    package.json
  /api
    /src
      main.py                 # FastAPI entry
      /routes
        __init__.py
        auth_routes.py
      /controllers
      /services
      /schemas
        base.py
      openapi.yml
      /tests
        test_auth.py
    pyproject.toml
/shared
  /models
  /types
/tools
  vet_deps.sh
  verify_licenses.sh
/ci
  ci.yml
package.json
README.md
```

---

## 🧪 5. Test Requirements

| Type | Description | Tool |
|------|--------------|------|
| **Unit Tests** | Test service logic, schemas, and helper functions | pytest |
| **Integration Tests** | Test FastAPI endpoints + DB + frontend interactions | pytest + Playwright |
| **E2E Tests (optional)** | User flow tests across Electron app | Playwright / Cypress |

All tests must run with:
```bash
pytest --maxfail=1 --disable-warnings -q
```

---

## 🧰 6. Dependency Vetting Script (FastAPI Example)

**File:** `/tools/vet_deps.sh`
```bash
#!/bin/bash
set -e
echo "🔍 Vetting Python dependencies..."
changed=$(git diff --name-only HEAD~1 | grep 'pyproject.toml' || true)
if [ -n "$changed" ]; then
  echo "Dependencies changed. Running audit..."
  poetry check
  pip-audit || echo "⚠️  Review audit manually."
fi
```

Add to pre-commit and CI:
```bash
chmod +x tools/vet_deps.sh
pre-commit run --all-files
```

---

## 🧩 7. Enforcement Mechanisms

| Type                              | Description                                                                |
| --------------------------------- | -------------------------------------------------------------------------- |
| **Pre-commit (Husky/Pre-commit)** | Run tests + lint + dep vet before commits                                  |
| **CI Gate (GitHub Actions)**      | Block merges unless all tests & lint pass                                  |
| **Commit Lint**                   | Enforce PR format and design justification                                 |
| **Bot Guardrail**                 | If AI generates >30 files in one commit, require justification comment     |
| **PR Checklist**                  | Require: Schema updated ✅ Tests ✅ Docs ✅ Migration notes ✅ Justification ✅ |

---

## 🧱 8. PR / Commit Templates

**Commit Template:**
```
type(scope): short message

WHY:
- Brief explanation (3 lines max)
- Tradeoffs considered

WHAT:
- Bullet summary of code changes

TESTS:
- Commands used to test

DEPENDENCIES:
- Added libs (name@version) + justification

MIGRATION/ROLLBACK:
- If relevant, note migration plan
```

**PR Checklist:**
* [ ] Schema updated
* [ ] Tests written & passed
* [ ] Dependencies vetted
* [ ] Docs updated
* [ ] Design rationale included

---

## 🧠 9. Assistant Persona (for Cursor AI System Prompt)

> You are an uncompromising **senior software architect** building an Electron + React + FastAPI application.
> Follow all saved rules exactly.
> Prioritize the simplest, most secure, testable solution.
> Always design API schema first.
> When recommending libraries, show metrics (stars, commits, CVEs).
> Never over-engineer or add unnecessary files.
> Each major change must include a short "WHY" explanation and fallback plan.
> Tests are mandatory.
> If unsure, stop and request clarification — do **not** assume.

---

## ⚡ 10. Anti-Overengineering Guardrails

* ❌ No CQRS, Event Sourcing, or microservices unless explicitly justified with metrics.
* ❌ No Redux or Zustand for small local state; prefer `useState` or `useReducer`.
* ❌ No premature optimization — code must run before being "optimized".
* ✅ Allowed: modular monolith with `/services`, `/controllers`, and shared schema.
* ✅ Must include one paragraph justification for any pattern beyond CRUD.

---

## 📋 11. AI Output Checklist (Auto-run in Cursor)

Before any PR or final code, the AI must verify:

| Check                              | Status |
| ---------------------------------- | ------ |
| Designed API/schema first?         | ✅ / ❌  |
| Checked dependency activity + CVE? | ✅ / ❌  |
| Wrote unit/integration tests?      | ✅ / ❌  |
| Feature files ≤ 3?                 | ✅ / ❌  |
| Commit message follows template?   | ✅ / ❌  |

If any ❌, stop and request human approval.

---

## 🧩 12. Complexity Score System

Each feature must have a **Complexity Score ≤ 3**.

| Score | Meaning                                       |
| ----- | --------------------------------------------- |
| 1     | Simple CRUD / small UI change                 |
| 2     | Logic layer + API interaction                 |
| 3     | Multi-component interaction or async handling |
| >3    | Must include justification + fallback plan    |

---

## 🔒 13. Security Requirements

* Use `pydantic` for all FastAPI input validation.
* Sanitize HTML and user content before rendering.
* Store secrets in `.env`, never commit credentials.
* Include `.env.example` for configuration clarity.
* Enforce CORS properly (React ↔ FastAPI).
* Always use HTTPS in production.

---

## 🪄 14. Example AI Prompts to Use

**Prompt for Building a Feature:**
> Build a new feature called `<feature>` in FastAPI + React.
> Follow contract-first, 3-file max per feature, and test coverage.
> Return backend schema, routes, and frontend component code in the canonical project structure.
> Explain reasoning for chosen approach in 3 lines max.

**Prompt for Library Decision:**
> Select libraries for `<functionality>` in this stack (React + FastAPI).
> Apply dependency vetting rules and justify each option with metrics and risk summary.

---

## 🧩 15. Summary of Non-Negotiables

* Always contract-first (schema before code).
* Never exceed 3 files per feature.
* Every dependency must have metrics + justification.
* No outdated or mixed libraries.
* No placeholder functions or mock names.
* Tests are mandatory for every feature.
* Each PR/commit includes WHY, WHAT, TEST, and DEPENDENCIES.
* Simplicity > cleverness, always.

---

## ✅ 16. Enforcement Scripts

### `.husky/pre-commit`
```bash
#!/bin/sh
echo "🔍 Running pre-commit checks..."
pytest --maxfail=1 --disable-warnings -q || exit 1
bash tools/vet_deps.sh || exit 1
echo "✅ All checks passed."
```

### `.commitlintrc.json`
```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "subject-case": [2, "always", ["sentence-case"]],
    "header-max-length": [2, "always", 72]
  }
}
```

---

## 🧩 17. Closing Reminder

These are not "guidelines" — they are **operational laws**.
Cursor AI must always:

* Design first, build second.
* Justify choices with measurable data.
* Produce working, testable, minimal code.
* Explain tradeoffs in concise professional terms.
* Prioritize maintainability over novelty.

If it violates any rule, stop generation and request human input.

---

**File Maintainer:** Talal (CTO | AI Developer | FastAPI + React + Electron)  
**Last Updated:** October 2025  
**Version:** 1.0
