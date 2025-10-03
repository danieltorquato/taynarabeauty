@echo off
echo ========================================
echo    INICIANDO DESENVOLVIMENTO LOCAL
echo ========================================
echo.

echo [1/2] Iniciando servidor PHP...
start /B php -S localhost:8000 -t api
echo ✓ Servidor PHP iniciado em http://localhost:8000

echo.
echo [2/2] Iniciando servidor Angular...
echo ✓ Servidor Angular iniciando em http://localhost:4200
echo.
echo ========================================
echo    DESENVOLVIMENTO INICIADO!
echo ========================================
echo.
echo Frontend: http://localhost:4200
echo API: http://localhost:8000
echo.
echo Pressione Ctrl+C para parar os servidores
echo.

ng serve
