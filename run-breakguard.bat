@echo off
title BreakGuard AST & Dependency Scanner
echo ===================================================
echo   BreakGuard 🛡️ - Static Codebase & Risk Analyzer
echo ===================================================
echo.
echo Scanning current project directory...
echo.

if exist "dist\breakguard.exe" (
    dist\breakguard.exe scan .
) else (
    node packages\cli\bin\breakguard.js scan .
)

echo.
echo ===================================================
echo Scan completed. Press any key to exit.
echo ===================================================
pause > nul
