# 🚀 Guia de Deploy - Taynara Beauty

## 📋 Pré-requisitos

- Servidor de hospedagem com PHP 7.4+ e MySQL
- Acesso ao painel de controle da hospedagem
- Acesso via FTP/SFTP ou gerenciador de arquivos

## 🔧 Configuração Local

### 1. Configurar Variáveis de Ambiente

Edite o arquivo `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://seudominio.com/api', // SUBSTITUA pelo seu domínio
  appName: 'Taynara Beauty'
};
```

### 2. Executar Build de Produção

**Windows:**
```bash
build-prod.bat
```

**Linux/Mac:**
```bash
chmod +x build-prod.sh
./build-prod.sh
```

**Ou manualmente:**
```bash
npm install
ng build --configuration=production
```

## 📁 Estrutura de Arquivos para Upload

Após o build, você terá esta estrutura:

```
📁 www/                    # Frontend (Angular)
├── index.html
├── main.js
├── polyfills.js
├── runtime.js
├── styles.css
├── assets/
└── .htaccess

📁 api/                    # Backend (PHP)
├── index.php
├── .htaccess
├── Config/
├── Controllers/
└── Routes/
```

## 🌐 Upload para Hospedagem

### Opção 1: Via Gerenciador de Arquivos (Recomendado)

1. **Acesse o painel de controle** da sua hospedagem
2. **Vá para o gerenciador de arquivos**
3. **Navegue até a pasta `public_html`** (ou equivalente)
4. **Faça upload da pasta `www/`**:
   - Selecione todos os arquivos dentro de `www/`
   - Faça upload para `public_html/`
5. **Faça upload da pasta `api/`**:
   - Crie uma pasta chamada `api` em `public_html/`
   - Faça upload de todos os arquivos da pasta `api/` para `public_html/api/`

### Opção 2: Via FTP/SFTP

1. **Conecte-se via FTP** usando suas credenciais
2. **Navegue até a pasta `public_html`**
3. **Faça upload da pasta `www/`** para `public_html/`
4. **Faça upload da pasta `api/`** para `public_html/api/`

## 🗄️ Configuração do Banco de Dados

### 1. Criar Banco de Dados

No painel de controle da hospedagem:
1. **Acesse "Bancos de Dados"** ou "MySQL"
2. **Crie um novo banco de dados**
3. **Anote o nome do banco, usuário e senha**

### 2. Configurar Conexão

Edite o arquivo `api/Config/Database.php`:

```php
<?php
class Database {
    private $host = 'localhost';           // ou o host fornecido pela hospedagem
    private $db_name = 'seu_banco';        // nome do banco criado
    private $username = 'seu_usuario';     // usuário do banco
    private $password = 'sua_senha';       // senha do banco
    private $charset = 'utf8mb4';
    
    // ... resto do código
}
```

### 3. Executar Scripts SQL

Execute os scripts SQL no banco de dados:
1. **Acesse o phpMyAdmin** (ou equivalente)
2. **Selecione seu banco de dados**
3. **Execute os scripts** na ordem:
   - `CREATE TABLE usuarios`
   - `CREATE TABLE profissionais`
   - `CREATE TABLE procedimentos`
   - `CREATE TABLE agendamentos`
   - `CREATE TABLE horarios_disponiveis`

## 🔒 Configurações de Segurança

### 1. Permissões de Arquivos

Certifique-se de que os arquivos tenham as permissões corretas:
- **Arquivos PHP**: 644
- **Pastas**: 755
- **Arquivos de configuração**: 600

### 2. Configurações do Servidor

Verifique se o servidor suporta:
- **PHP 7.4+**
- **MySQL 5.7+**
- **Mod_rewrite** (para URLs amigáveis)
- **CORS** (para requisições da API)

## 🧪 Testando o Deploy

### 1. Teste do Frontend

Acesse: `https://seudominio.com`

### 2. Teste da API

Acesse: `https://seudominio.com/api`

### 3. Teste de Funcionalidades

1. **Cadastro de usuário**
2. **Login**
3. **Agendamento**
4. **Listagem de agendamentos**

## 🐛 Solução de Problemas

### Erro 500 - Internal Server Error

1. **Verifique os logs de erro** no painel de controle
2. **Confirme as permissões** dos arquivos
3. **Verifique a configuração** do banco de dados

### Erro de CORS

1. **Verifique o arquivo** `api/.htaccess`
2. **Confirme as configurações** de CORS no servidor

### Página em Branco

1. **Verifique se todos os arquivos** foram enviados
2. **Confirme a configuração** do `.htaccess`
3. **Verifique os logs** de erro do servidor

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** de erro
2. **Teste localmente** primeiro
3. **Confirme as configurações** do servidor
4. **Verifique a documentação** da hospedagem

## 🔄 Atualizações Futuras

Para atualizar o sistema:

1. **Faça as alterações** localmente
2. **Execute o build** de produção
3. **Faça upload** apenas dos arquivos alterados
4. **Teste** as funcionalidades

---

## 📝 Checklist de Deploy

- [ ] Configurar `environment.prod.ts`
- [ ] Executar build de produção
- [ ] Fazer upload do frontend (`www/`)
- [ ] Fazer upload do backend (`api/`)
- [ ] Configurar banco de dados
- [ ] Testar funcionalidades
- [ ] Verificar logs de erro
- [ ] Configurar backup automático

---

**🎉 Parabéns! Seu sistema está online!**
