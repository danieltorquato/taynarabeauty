#!/bin/bash

echo "========================================"
echo "   BUILD PARA PRODUCAO - TAYNARA BEAUTY"
echo "========================================"
echo

echo "[1/4] Limpando arquivos antigos..."
rm -rf dist
rm -rf www
echo "✓ Arquivos antigos removidos"

echo
echo "[2/4] Instalando dependencias..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependencias"
    exit 1
fi
echo "✓ Dependencias instaladas"

echo
echo "[3/4] Fazendo build do Angular..."
ng build --configuration=production
if [ $? -ne 0 ]; then
    echo "❌ Erro no build do Angular"
    exit 1
fi
echo "✓ Build do Angular concluido"

echo
echo "[4/4] Copiando arquivos para www..."
mkdir -p www
cp -r dist/* www/
echo "✓ Arquivos copiados para www"

echo
echo "========================================"
echo "   BUILD CONCLUIDO COM SUCESSO!"
echo "========================================"
echo
echo "Arquivos prontos para upload em: www/"
echo
echo "Para fazer upload:"
echo "1. Acesse seu painel de hospedagem"
echo "2. Vá para o gerenciador de arquivos"
echo "3. Navegue até a pasta public_html"
echo "4. Faça upload de todos os arquivos da pasta www/"
echo "5. Faça upload da pasta api/ para o servidor"
echo
