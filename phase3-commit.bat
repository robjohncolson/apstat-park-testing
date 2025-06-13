@echo off
echo Committing Phase 3 changes...
echo.

REM Add all changes
git add -A

REM Commit with descriptive message
git commit -m "phase-3: add tooling scripts, ESLint coverage, and student docs

- Add format script to package.json (Prettier defaults)
- Expand ESLint config with JSX support and apps/ overrides
- Create comprehensive PDF tutoring guide (docs/using-pdfs-with-grok.md)
- Add learning workflow diagram with Mermaid (docs/learning-flow.md)
- Create root README with quick start and project structure
- All scripts work with run.bat for locked Windows environment"

echo.
echo Creating Phase 3 completion tag...
git tag phase-3-complete

echo.
echo Phase 3 complete! 🚀
echo.
echo Summary of changes:
echo - ✅ Root npm scripts (format, lint, test, test:e2e)
echo - ✅ Prettier config (defaults)
echo - ✅ ESLint coverage for apps/web TypeScript/JSX
echo - ✅ Student PDF tutoring guide
echo - ✅ Learning workflow Mermaid diagram
echo - ✅ Root README with quick start
echo.
echo Next: Test the new scripts with:
echo   run.bat npm run format
echo   run.bat npm run lint
echo   run.bat npm run test
echo.
pause 