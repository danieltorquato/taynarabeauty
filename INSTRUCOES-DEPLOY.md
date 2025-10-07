# Instruções para Deploy - Taynara Beauty

## Problema Resolvido: Erro 404 ao Atualizar na Web

O erro 404 que ocorria ao atualizar a página na web foi causado pela falta de configuração adequada do servidor web para aplicações Angular/Ionic (SPA - Single Page Application).

## Solução Implementada

### 1. Arquivo .htaccess Criado
- **Localização**: Raiz do projeto
- **Função**: Configura o Apache para redirecionar todas as requisições para `index.html`
- **Benefícios**: 
  - Resolve o erro 404 ao atualizar páginas
  - Configura cache para arquivos estáticos
  - Adiciona headers de segurança
  - Configura compressão GZIP

### 2. Scripts de Build Atualizados
- **build-prod.bat** (Windows): Inclui cópia do .htaccess
- **build-prod.sh** (Linux/Mac): Inclui cópia do .htaccess

### 3. Configurações de Servidor
- **nginx.conf**: Configuração para servidores Nginx
- **apache.conf**: Configuração alternativa para Apache

## Como Fazer o Deploy

### Opção 1: Usando os Scripts de Build

#### Windows:
```bash
build-prod.bat
```

#### Linux/Mac:
```bash
chmod +x build-prod.sh
./build-prod.sh
```

### Opção 2: Manual

1. **Build do Angular:**
   ```bash
   ng build --configuration=production
   ```

2. **Copiar arquivos:**
   ```bash
   mkdir www
   cp -r dist/* www/
   cp .htaccess www/
   ```

3. **Upload para servidor:**
   - Faça upload de todos os arquivos da pasta `www/` para `public_html/`
   - Faça upload da pasta `api/` para o servidor

## Verificação Pós-Deploy

1. **Teste de roteamento:**
   - Acesse a aplicação
   - Navegue para diferentes páginas
   - Atualize a página (F5) - não deve mais dar erro 404

2. **Teste da API:**
   - Acesse `https://seudominio.com/api/`
   - Deve retornar informações da API

3. **Teste de arquivos estáticos:**
   - Verifique se imagens e CSS carregam corretamente

## Configurações Importantes

### Para Hospedagem Compartilhada (cPanel):
- Use o arquivo `.htaccess` fornecido
- Certifique-se de que o mod_rewrite está habilitado

### Para VPS/Dedicado:
- Use `nginx.conf` para Nginx
- Use `apache.conf` para Apache
- Configure o servidor web conforme necessário

## Troubleshooting

### Se ainda der erro 404:
1. Verifique se o arquivo `.htaccess` foi enviado para o servidor
2. Confirme se o mod_rewrite está habilitado
3. Verifique as permissões dos arquivos (644 para arquivos, 755 para pastas)

### Se a API não funcionar:
1. Verifique se a pasta `api/` foi enviada
2. Confirme se o PHP está funcionando
3. Verifique as configurações de banco de dados em `api/Config/Database.php`

## Estrutura Final no Servidor

```
public_html/
├── .htaccess
├── index.html
├── assets/
├── api/
│   ├── .htaccess
│   ├── index.php
│   └── ...
└── outros arquivos do build...
```

## Suporte

Se ainda houver problemas, verifique:
1. Logs do servidor web
2. Console do navegador (F12)
3. Configurações de hospedagem
