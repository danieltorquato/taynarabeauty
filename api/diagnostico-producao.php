<?php
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Tratar requisições OPTIONS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

echo "=== DIAGNÓSTICO DE PRODUÇÃO - TAYNARA BEAUTY ===\n\n";

// 1. Informações do servidor
echo "1. INFORMAÇÕES DO SERVIDOR:\n";
echo "   Servidor: " . ($_SERVER['SERVER_NAME'] ?? 'N/A') . "\n";
echo "   Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'N/A') . "\n";
echo "   PHP Version: " . phpversion() . "\n";
echo "   Sistema: " . php_uname() . "\n\n";

// 2. Extensões PHP necessárias
echo "2. EXTENSÕES PHP:\n";
$extensions = ['pdo', 'pdo_mysql', 'json', 'curl'];
foreach ($extensions as $ext) {
    $status = extension_loaded($ext) ? '✅' : '❌';
    echo "   $ext: $status\n";
}
echo "\n";

// 3. Configurações PHP
echo "3. CONFIGURAÇÕES PHP:\n";
echo "   max_execution_time: " . ini_get('max_execution_time') . "\n";
echo "   memory_limit: " . ini_get('memory_limit') . "\n";
echo "   upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "   post_max_size: " . ini_get('post_max_size') . "\n\n";

// 4. Teste de conectividade com diferentes configurações
echo "4. TESTE DE CONECTIVIDADE COM BANCO:\n";

$configs = [
    'Configuração 1' => [
        'host' => 'localhost',
        'port' => '3306',
        'db' => 'taynarabeauty_prod',
        'user' => 'taynarabeauty_user',
        'pass' => 'sua_senha_aqui'
    ],
    'Configuração 2' => [
        'host' => 'localhost',
        'port' => '3306',
        'db' => 'taynarabeauty',
        'user' => 'taynarabeauty',
        'pass' => 'sua_senha_aqui'
    ],
    'Configuração 3' => [
        'host' => 'localhost',
        'port' => '3306',
        'db' => 'taynarabeauty_prod',
        'user' => 'root',
        'pass' => 'sua_senha_aqui'
    ]
];

foreach ($configs as $name => $config) {
    echo "   Testando $name...\n";
    try {
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['db']};charset=utf8mb4";
        $conn = new PDO($dsn, $config['user'], $config['pass']);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "   ✅ $name: SUCESSO\n";
        
        // Testar se as tabelas existem
        $tables = ['usuarios', 'profissionais', 'procedimentos', 'agendamentos'];
        $tablesFound = 0;
        foreach ($tables as $table) {
            $stmt = $conn->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$table]);
            if ($stmt->rowCount() > 0) {
                $tablesFound++;
            }
        }
        echo "   📊 Tabelas encontradas: $tablesFound/" . count($tables) . "\n";
        
    } catch (PDOException $e) {
        echo "   ❌ $name: FALHOU - " . $e->getMessage() . "\n";
    }
    echo "\n";
}

// 5. Teste de permissões de arquivo
echo "5. PERMISSÕES DE ARQUIVO:\n";
$files = ['index.php', 'Config/Database.php', 'Controllers/AuthController.php'];
foreach ($files as $file) {
    if (file_exists($file)) {
        $perms = fileperms($file);
        $readable = is_readable($file) ? '✅' : '❌';
        echo "   $file: $readable (permissão: " . substr(sprintf('%o', $perms), -4) . ")\n";
    } else {
        echo "   $file: ❌ NÃO ENCONTRADO\n";
    }
}
echo "\n";

// 6. Teste de URL rewriting
echo "6. TESTE DE URL REWRITING:\n";
if (file_exists('.htaccess')) {
    echo "   .htaccess: ✅ EXISTE\n";
    $htaccess_content = file_get_contents('.htaccess');
    if (strpos($htaccess_content, 'RewriteEngine') !== false) {
        echo "   RewriteEngine: ✅ CONFIGURADO\n";
    } else {
        echo "   RewriteEngine: ❌ NÃO CONFIGURADO\n";
    }
} else {
    echo "   .htaccess: ❌ NÃO EXISTE\n";
}
echo "\n";

// 7. Instruções para configuração
echo "=== INSTRUÇÕES PARA CONFIGURAÇÃO ===\n";
echo "1. Acesse o painel de controle da sua hospedagem\n";
echo "2. Vá para 'Bancos de Dados' ou 'MySQL'\n";
echo "3. Anote as informações do banco:\n";
echo "   - Host (geralmente localhost)\n";
echo "   - Porta (geralmente 3306)\n";
echo "   - Nome do banco\n";
echo "   - Usuário\n";
echo "   - Senha\n";
echo "4. Edite o arquivo 'Config/Database.php' com essas informações\n";
echo "5. Execute os scripts SQL no banco de dados\n";
echo "6. Teste novamente\n\n";

echo "=== FIM DO DIAGNÓSTICO ===\n";
?>
