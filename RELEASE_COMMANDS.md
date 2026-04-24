# Commands to push code and create a release

Run these in PowerShell from the repo root: `c:\Users\heyyt\Downloads\github\espot-browser`

---

## 1. Push your code to GitHub

```powershell
cd "c:\Users\heyyt\Downloads\github\espot-browser"

# Stage the release-related changes
git add .github/workflows/release.yml frontend/package.json

# Optional: also stage other modified files if you want them in this commit
# git add frontend/electron/main/main.ts

# Commit
git commit -m "fix: auto-update - publish as draft then publish release so latest.yml is uploaded"

# Push to GitHub (use your branch name if not main)
git push origin main
```

---

## 2. Create and push a tag to trigger the release workflow

The workflow runs when you push a tag like `v1.0.11`. The workflow will:
- Set version in package.json from the tag
- Build and upload installers + `latest.yml` to a **draft** release
- Then **publish** that release (so it’s not draft anymore)

Pick a version number (e.g. one more than current). Current version in package.json is **1.0.10**, so next could be **1.0.11** or **1.0.12**.

```powershell
# Create tag (change 1.0.11 to your desired version)
git tag v1.0.11

# Push the tag — this triggers the Release workflow
git push origin v1.0.11
```

---

## One-shot (code + tag in one go)

```powershell
cd "c:\Users\heyyt\Downloads\github\espot-browser"

git add .github/workflows/release.yml frontend/package.json
git commit -m "fix: auto-update - publish release so latest.yml is uploaded"
git push origin main

git tag v1.0.11
git push origin v1.0.11
```

After the workflow finishes (a few minutes), the release will be **published** (not draft) and “Check for updates” in the app should work.
