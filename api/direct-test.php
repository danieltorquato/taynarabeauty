<?php
// Teste direto sem roteamento
echo "=== TESTE DIRETO DA API ===\n";
echo "Data: " . date('Y-m-d H:i:s') . "\n";
echo "Servidor: " . ($_SERVER['SERVER_NAME'] ?? 'N/A') . "\n";
echo "PHP: " . phpversion() . "\n";
echo "Pasta: " . __DIR__ . "\n";
echo "Arquivo: " . __FILE__ . "\n\n";

// Testar se os arquivos existem
$files = ['index.php', 'Config/Database.php', 'Controllers/AuthController.php'];
echo "=== VERIFICAÇÃO DE ARQUIVOS ===\n";
foreach ($files as $file) {
    $path = __DIR__ . '/' . $file;
    if (file_exists($path)) {
        echo "✅ $file: EXISTE\n";
    } else {
        echo "❌ $file: NÃO EXISTE\n";
    }
}

echo "\n=== TESTE DE CONEXÃO COM BANCO ===\n";
try {
    require_once __DIR__ . '/Config/Database.php';
    $db = new Database();
    $conn = $db->connect();
    if ($conn) {
        echo "✅ Conexão com banco: SUCESSO\n";
    } else {
        echo "❌ Conexão com banco: FALHOU\n";
    }
} catch (Exception $e) {
    echo "❌ Erro na conexão: " . $e->getMessage() . "\n";
}

echo "\n=== FIM DO TESTE ===\n";
?>
