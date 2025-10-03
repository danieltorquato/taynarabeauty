<?php
// Script para atualizar o banco de dados e adicionar coluna telefone
require_once __DIR__ . '/Config/Database.php';

$db = new Database();
$conn = $db->connect();

if ($conn === null) {
    die("Erro na conexão com o banco de dados");
}

try {
    echo "Iniciando atualização do banco de dados...\n";

    // Verificar se a coluna telefone existe
    $stmt = $conn->prepare("SHOW COLUMNS FROM usuarios LIKE 'telefone'");
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        echo "Coluna telefone não existe. Adicionando...\n";

        // Adicionar coluna telefone como NOT NULL com valor padrão
        $conn->exec("ALTER TABLE usuarios ADD COLUMN telefone VARCHAR(20) NOT NULL DEFAULT '11999999999' AFTER email");

        echo "Coluna telefone adicionada com sucesso!\n";
    } else {
        echo "Coluna telefone já existe.\n";

        // Verificar se a coluna permite NULL
        $stmt = $conn->prepare("SHOW COLUMNS FROM usuarios WHERE Field = 'telefone'");
        $stmt->execute();
        $column = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($column['Null'] === 'YES') {
            echo "Atualizando coluna telefone para NOT NULL...\n";

            // Atualizar registros com telefone NULL
            $conn->exec("UPDATE usuarios SET telefone = '11999999999' WHERE telefone IS NULL OR telefone = ''");

            // Alterar coluna para NOT NULL
            $conn->exec("ALTER TABLE usuarios MODIFY COLUMN telefone VARCHAR(20) NOT NULL");

            echo "Coluna telefone atualizada para NOT NULL!\n";
        }
    }

    // Verificar estrutura final
    echo "\nEstrutura final da tabela usuarios:\n";
    $stmt = $conn->prepare("DESCRIBE usuarios");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($columns as $column) {
        echo "- {$column['Field']}: {$column['Type']} " . ($column['Null'] === 'NO' ? 'NOT NULL' : 'NULL') . "\n";
    }

    echo "\nAtualização concluída com sucesso!\n";

} catch (Exception $e) {
    echo "Erro durante a atualização: " . $e->getMessage() . "\n";
}
?>
