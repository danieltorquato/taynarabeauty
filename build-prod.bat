@echo off
echo ========================================
echo    BUILD PARA PRODUCAO - TAYNARA BEAUTY
echo ========================================
echo.

echo [1/4] Limpando arquivos antigos...
if exist dist rmdir /s /q dist
if exist www rmdir /s /q www
echo ✓ Arquivos antigos removidos

echo.
echo [2/4] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependencias
    pause
    exit /b 1
)
echo ✓ Dependencias instaladas

echo.
echo [3/4] Fazendo build do Angular...
call ng build --configuration=production
if %errorlevel% neq 0 (
    echo ❌ Erro no build do Angular
    pause
    exit /b 1
)
echo ✓ Build do Angular concluido

echo.
echo [4/4] Copiando arquivos para www...
if not exist www mkdir www
xcopy /E /I /Y dist\* www\
echo ✓ Arquivos copiados para www

echo.
echo [5/5] Copiando arquivos de configuração...
copy .htaccess www\
echo ✓ Arquivo .htaccess copiado

echo.
echo ========================================
echo    BUILD CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Arquivos prontos para upload em: www/
echo.
echo Para fazer upload:
echo 1. Acesse seu painel de hospedagem
echo 2. Vá para o gerenciador de arquivos
echo 3. Navegue até a pasta public_html
echo 4. Faça upload de todos os arquivos da pasta www/
echo 5. Faça upload da pasta api/ para o servidor
echo.
pause
