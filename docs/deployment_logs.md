# Netlify Deployment Log — Math Practice App

## Project and URLs

- **Application:** Math Practice Web Application for ages 7–12
- **Source repository:** https://github.com/jgb23002/math-practice-app
- **Production website:** https://delicate-maamoul-df1e86.netlify.app/
- **Netlify project:** `delicate-maamoul-df1e86`
- **Production branch:** `main`
- **Deployment method:** Netlify project linked to GitHub
- **Deployment date shown in supplied screenshots:** October 21, 2026
- **Status:** Published; live functional verification is partly outstanding

## Deployment configuration

The project uses React, TypeScript, Vite, and client-side routing. Its repository
includes Netlify deployment and single-page-app routing configuration.

| Setting                                  | Value                        |
| ---------------------------------------- | ---------------------------- |
| Build command                            | `npm run build`              |
| Publish directory                        | `dist`                       |
| Node.js version documented for the build | `24.14.1`                    |
| Production branch                        | `main`                       |
| Intended SPA fallback                    | `/*` → `/index.html` (`200`) |

The last two technical settings are documented in the project README and must
be compared with the current Netlify build settings and `netlify.toml` when auditing.

## Pre-deployment verification

The following results were captured in local VS Code terminal screenshots:

| Check                  | Recorded result                          | Evidence                  |
| ---------------------- | ---------------------------------------- | ------------------------- |
| Vitest full test suite | 1,311 tests passed; 65 test files passed | `01_Final_Test_Suite.png` |
| ESLint                 | Passed, zero warnings                    | `02_Lint_Results.png`     |
| Prettier               | All matched files use Prettier style     | `02_Lint_Results.png`     |
| TypeScript             | `tsc -b` passed                          | `02_Lint_Results.png`     |
| Production build       | Vite build succeeded                     | `03_Production_Build.png` |

These are local verification results, not proof that every interaction works on
the publicly hosted site.

## Netlify publication evidence

1. The Netlify project overview identifies the public project
   `delicate-maamoul-df1e86` and the production address
   `delicate-maamoul-df1e86.netlify.app`.
2. The project overview displays **Published**, identifies GitHub as the deploy
   source, and shows a production publication around 9:45 PM in the screenshot.
3. A Safari screenshot shows the live Math Practice homepage loading with the
   Netlify domain visible in the address bar.
4. The Netlify overview also displays a recent production activity entry
   `Configure Netlify deployment` associated with branch `main`.

**Evidence files:**

- `docs/evidence/04-final-verification/08a_Netlify_Deploy_Success.png`
- `docs/evidence/04-final-verification/08b_Public_Application.png`

## Live-site acceptance checks

Mark items complete only after they have been tested directly on the public
Netlify URL. Publication and homepage rendering are already evidenced.

- [x] Netlify shows a public, published production deployment.
- [x] Public homepage renders in Safari with the production URL visible.
- [ ] Start a new practice session and complete a question on the public site.
- [ ] Finish a session and verify its summary and statistics.
- [ ] Create an incorrect self-report and begin Mistake Review on the public site.
- [ ] Refresh `/statistics` and `/settings` directly without a 404 response.
- [ ] Refresh during a session and verify expected session recovery.
- [ ] Confirm saved progress persists after a refresh in the same browser/origin.
- [ ] Check the layout at a narrow/mobile viewport.
- [ ] Check the browser console for critical errors.
- [ ] Confirm the latest intended GitHub commit has completed deployment.

**Privacy note:** Practice data is stored in browser localStorage. The live
Netlify origin has separate storage from localhost, so local practice history
is not automatically transferred to the deployed application.

## Submission destinations

1. **GitHub repository link:** provide the URL above in the HuskyCT assignment.
2. **Netlify application link:** provide the production website URL above.
3. **Development report:** attach a separate 2–3-page PDF documenting the
   development process and testing.
4. **AI conversation evidence:** attach a separate PDF with selected initial
   development, feature implementation, and debugging interactions.
5. Keep screenshots in `docs/evidence/04-final-verification/` and include
   selected deployment evidence in the submitted report/evidence PDF.

## Final documentation and Git steps

After copying the two deployment screenshots into the evidence directory and
updating documentation, run from the repository root:

```bash
npx prettier --write README.md docs/Development_logs.md docs/deployment_logs.md
npm run format:check
git status
git add README.md docs/Development_logs.md docs/deployment_logs.md docs/evidence/04-final-verification/
git commit -m "Document Netlify deployment and verification"
git push origin main
git status
```

If no files have changed, skip the commit. Confirm the new commit reaches the
Netlify production deployment after the push. Do not mark remaining live
checks complete until independently performed.
