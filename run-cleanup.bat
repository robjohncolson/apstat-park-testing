@echo off

REM === run-cleanup.bat ===
REM Archives legacy HTML, JS, and API assets into ./archive keeping git history.

echo.
echo ** Creating archive structure...
mkdir archive
mkdir archive\legacy-html
mkdir archive\api-deprecated
mkdir archive\docs-old

REM Move legacy files/directories if they still exist

echo.
echo ** Archiving legacy HTML, JS, and API files...
if exist unified-lesson.html git mv unified-lesson.html archive\legacy-html\
if exist mobile-lesson.html git mv mobile-lesson.html archive\legacy-html\
if exist index.html git mv index.html archive\legacy-html\
if exist index.old git mv index.old archive\legacy-html\
if exist js git mv js archive\legacy-html\
if exist structure.txt git mv structure.txt archive\legacy-html\
if exist api git mv api archive\api-deprecated\
if exist syllabus.tex git mv syllabus.tex archive\docs-old\

REM Commit changes

echo.
echo ** Committing archival changes...
git add .
git commit -m "chore(structure): archive legacy html, js, and api assets"

echo.
echo ** Cleanup complete. Legacy files moved to archive/.

echo Press any key to exit.
pause > nul 