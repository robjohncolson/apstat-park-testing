@echo off
echo Starting Phase 2 cleanup - organizing documentation
echo.

REM Create the docs directory
mkdir docs
echo Created docs/ directory
echo.

REM Move documentation files
git mv cursor_fixing_broken_links_in_web_app.md docs/
git mv multphase-transition-roadmap.txt docs/
echo Moved documentation files into docs/
echo.

REM Commit the changes
git add -A
git commit -m "phase-2: create docs directory and relocate project notes"

echo.
echo Phase 2 cleanup complete!
echo Changes committed to git.
echo.
pause 