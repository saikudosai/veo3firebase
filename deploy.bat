@echo off
rem =================================================================
rem ==                                                              ==
rem ==           SKRIP DEPLOY OTOMATIS UNTUK FIREBASE               ==
rem ==                                                              ==
rem =================================================================

title Firebase Deployer

echo ==================================================
echo     MEMULAI PROSES FIREBASE DEPLOY OTOMATIS
echo ==================================================
echo.

rem --- PENTING: UBAH PATH DI BAWAH INI ---
set "PROJECT_PATH=C:\Users\Ahmad Fahmi\Documents\AI\veo3fire"

echo Pindah ke direktori proyek:
echo %PROJECT_PATH%
cd /d "%PROJECT_PATH%"

rem Periksa apakah perpindahan direktori berhasil
if %errorlevel% neq 0 (
    echo.
    echo GAGAL: Direktori proyek tidak ditemukan.
    echo Pastikan path di dalam skrip sudah benar.
    echo.
    goto :end
)

echo.
echo Menjalankan 'firebase deploy'...
echo Perintah ini akan mendeploy seluruh bagian proyek.
echo.
firebase deploy

rem Periksa hasil dari perintah deploy dan beri notifikasi
if %errorlevel% equ 0 (
    echo.
    echo ==================================================
    echo     BERHASIL: Proyek berhasil di-deploy.
    echo ==================================================
) else (
    echo.
    echo ==================================================
    echo     GAGAL: Terjadi error saat proses deploy.
    echo     Periksa pesan error di atas.
    echo ==================================================
)

:end
echo.
rem Perintah timeout ini tidak terlalu diperlukan karena sudah ada pause
rem tapi bisa dibiarkan jika Anda ingin jeda sebelum pesan "Press any key"
timeout /t 5 /nobreak > nul
pause