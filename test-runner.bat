@echo off
REM Main test runner - delegates to tests folder
echo 🧪 Vega.ai Test Runner
echo Delegating to tests/test-runner.bat...

call tests\test-runner.bat %*
