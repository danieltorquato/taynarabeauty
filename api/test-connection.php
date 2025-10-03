<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Tratar requisições OPTIONS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

echo "=== TESTE DE CONECTIVIDADE ===\n\n";

// 1. Testar se o PHP está funcionando
echo "1. PHP funcionando: ✅\n";
echo "   Versão PHP: " . phpversion() . "\n\n";

// 2. Testar extensão PDO
echo "2. Extensão PDO: ";
if (extension_loaded('pdo')) {
    echo "✅ Disponível\n";
} else {
    echo "❌ NÃO DISPONÍVEL\n";
}

echo "3. Extensão PDO MySQL: ";
if (extension_loaded('pdo_mysql')) {
    echo "✅ Disponível\n";
} else {
    echo "❌ NÃO DISPONÍVEL\n";
}

echo "\n";

// 3. Testar conexão com banco de dados
echo "3. Testando conexão com banco de dados...\n";

// Configurações do banco (altere conforme sua hospedagem)
$host = "localhost";
$db_name = "taynara_beauty";
$username = "root";
$password = "danielsdev!!";

try {
    $conn = new PDO(
        "mysql:host=" . $host . ";dbname=" . $db_name,
        $username,
        $password
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "   ✅ Conexão com banco de dados: SUCESSO\n";
    
    // Testar se as tabelas existem
    $tables = ['usuarios', 'profissionais', 'procedimentos', 'agendamentos', 'horarios_disponiveis'];
    echo "\n4. Verificando tabelas:\n";
    
    foreach ($tables as $table) {
        $stmt = $conn->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        if ($stmt->rowCount() > 0) {
            echo "   ✅ Tabela '$table': EXISTE\n";
        } else {
            echo "   ❌ Tabela '$table': NÃO EXISTE\n";
        }
    }
    
} catch(PDOException $e) {
    echo "   ❌ Erro na conexão: " . $e->getMessage() . "\n";
    echo "   Código do erro: " . $e->getCode() . "\n";
    
    // Sugestões de solução
    echo "\n=== POSSÍVEIS SOLUÇÕES ===\n";
    echo "1. Verifique se o banco de dados existe\n";
    echo "2. Verifique se o usuário tem permissão\n";
    echo "3. Verifique se a senha está correta\n";
    echo "4. Verifique se o host está correto\n";
    echo "5. Verifique se o MySQL está rodando\n";
}

echo "\n=== INFORMAÇÕES DO SERVIDOR ===\n";
echo "Servidor: " . $_SERVER['SERVER_NAME'] . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Script Path: " . __FILE__ . "\n";
echo "Data/Hora: " . date('Y-m-d H:i:s') . "\n";
?>
