@echo off
cd backend
call venv\Scripts\activate.bat
python ..\frontend\generate_password_hash.py
pause
