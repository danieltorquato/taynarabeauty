<?php
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo "=== CONFIGURAÇÃO DO BANCO DE DADOS ===\n\n";

// Configurações do banco (ALTERE AQUI)
$host = "localhost";
$port = "3306";
$db_name = "taynarabeauty_prod";
$username = "taynarabeauty_user";
$password = "sua_senha_aqui";

echo "Testando conexão com banco de dados...\n";
echo "Host: $host\n";
echo "Porta: $port\n";
echo "Banco: $db_name\n";
echo "Usuário: $username\n\n";

try {
    $dsn = "mysql:host=$host;port=$port;charset=utf8mb4";
    $conn = new PDO($dsn, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "✅ Conexão com servidor MySQL: SUCESSO\n";

    // Verificar se o banco existe
    $stmt = $conn->prepare("SHOW DATABASES LIKE ?");
    $stmt->execute([$db_name]);
    if ($stmt->rowCount() > 0) {
        echo "✅ Banco de dados '$db_name': EXISTE\n";

        // Conectar ao banco específico
        $conn = new PDO("mysql:host=$host;port=$port;dbname=$db_name;charset=utf8mb4", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Verificar tabelas
        $tables = ['usuarios', 'profissionais', 'procedimentos', 'agendamentos', 'horarios_disponiveis'];
        echo "\nVerificando tabelas:\n";

        foreach ($tables as $table) {
            $stmt = $conn->prepare("SHOW TABLES LIKE ?");
            $stmt->execute([$table]);
            if ($stmt->rowCount() > 0) {
                echo "✅ Tabela '$table': EXISTE\n";
            } else {
                echo "❌ Tabela '$table': NÃO EXISTE\n";
            }
        }

    } else {
        echo "❌ Banco de dados '$db_name': NÃO EXISTE\n";
        echo "\nPara criar o banco:\n";
        echo "1. Acesse o painel de controle da hospedagem\n";
        echo "2. Vá para 'Bancos de Dados' ou 'MySQL'\n";
        echo "3. Crie um banco com o nome: $db_name\n";
        echo "4. Execute os scripts SQL necessários\n";
    }

} catch(PDOException $e) {
    echo "❌ Erro na conexão: " . $e->getMessage() . "\n";
    echo "\nPossíveis soluções:\n";
    echo "1. Verifique se o banco de dados existe\n";
    echo "2. Verifique se o usuário tem permissão\n";
    echo "3. Verifique se a senha está correta\n";
    echo "4. Verifique se o host está correto\n";
    echo "5. Verifique se o MySQL está rodando\n";
}

echo "\n=== FIM DA CONFIGURAÇÃO ===\n";
?>
