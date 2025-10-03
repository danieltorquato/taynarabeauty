@echo off
echo ========================================
echo    UPLOAD DOS ARQUIVOS CORRIGIDOS
echo ========================================
echo.

echo [1/3] Verificando arquivos corrigidos...
if not exist api\Config\Database.php (
    echo ❌ Arquivo Database.php não encontrado
    pause
    exit /b 1
)
if not exist api\test-connection-simple.php (
    echo ❌ Arquivo test-connection-simple.php não encontrado
    pause
    exit /b 1
)
echo ✓ Arquivos corrigidos encontrados

echo.
echo [2/3] Arquivos para upload:
echo.
echo api\Config\Database.php (corrigido)
echo api\test-connection-simple.php (novo)
echo.

echo [3/3] Instruções:
echo.
echo 1. Faça upload dos arquivos para public_html/api/
echo 2. Teste: https://taynaracasagrandebeauty.torquatoit.com/api/test-connection-simple.php
echo 3. Altere a senha no arquivo test-connection-simple.php se necessário
echo 4. Teste novamente
echo.

echo ========================================
echo    ARQUIVOS PRONTOS PARA UPLOAD!
echo ========================================
echo.
pause
