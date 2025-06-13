@echo off
echo Starting Phase 1 cleanup - moving legacy files to archive/
echo.

REM Create archive directories
mkdir archive
mkdir archive\legacy-html
mkdir archive\api-deprecated
mkdir archive\docs-old

echo Created archive directories
echo.

REM Move legacy HTML and JS files
git mv unified-lesson.html archive\legacy-html\
git mv mobile-lesson.html archive\legacy-html\
git mv index.html archive\legacy-html\
git mv index.old archive\legacy-html\
git mv js archive\legacy-html\
git mv structure.txt archive\legacy-html\

echo Moved legacy HTML and JS files
echo.

REM Move deprecated API
git mv api archive\api-deprecated\

echo Moved deprecated API
echo.

REM Move TeX files (keeping PDFs sacred)
git mv syllabus.tex archive\docs-old\

echo Moved TeX files
echo.

REM Commit the changes
git add -A
git commit -m "phase-1: move legacy html/js/api into archive/"

echo.
echo Phase 1 cleanup complete!
echo Legacy files moved to archive/ directories
echo Changes committed to git
echo.
pause 