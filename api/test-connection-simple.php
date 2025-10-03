<?php
// Teste simples de conexão
echo "Teste de Conexão\n";
echo "================\n\n";

// Configurações descobertas pelo erro anterior
$host = "localhost";
$dbname = "u576486711_taynarabeauty";
$username = "u576486711_danieltorq";
$password = "SUA_SENHA_AQUI"; // ALTERE ESTA SENHA

echo "Host: $host\n";
echo "Banco: $dbname\n";
echo "Usuário: $username\n\n";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "✅ Conexão: SUCESSO\n";

    // Testar query simples
    $stmt = $pdo->query("SELECT 1 as test");
    $result = $stmt->fetch();
    echo "✅ Query teste: " . $result['test'] . "\n";

} catch(PDOException $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
    echo "\nPara corrigir:\n";
    echo "1. Altere a senha na linha 8 deste arquivo\n";
    echo "2. Verifique se o banco existe\n";
    echo "3. Verifique se o usuário tem permissão\n";
}
?>
