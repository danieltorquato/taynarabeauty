<?php
require_once __DIR__ . '/../Config/Timezone.php';
require_once __DIR__ . '/../Config/Database.php';

class UsuariosController {
    public function listar() {
        header('Content-Type: application/json');

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            $usuarios = [];

            // Check if usuarios table exists
            $stmt = $conn->prepare("SHOW TABLES LIKE 'usuarios'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $stmt = $conn->prepare('SELECT id, nome, email, role FROM usuarios ORDER BY nome');
                $stmt->execute();
                $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                // Create demo data if table doesn't exist
                $usuarios = [
                    ['id' => 1, 'nome' => 'Cliente Padrão', 'email' => 'cliente@taynarabeauty.com', 'role' => 'cliente'],
                    ['id' => 2, 'nome' => 'Admin', 'email' => 'admin@taynarabeauty.com', 'role' => 'admin'],
                    ['id' => 3, 'nome' => 'Taynara Casagrande', 'email' => 'taynara@taynarabeauty.com', 'role' => 'profissional'],
                    ['id' => 4, 'nome' => 'Mayara Casagrande', 'email' => 'mayara@taynarabeauty.com', 'role' => 'profissional'],
                    ['id' => 5, 'nome' => 'Sara Casagrande', 'email' => 'sara@taynarabeauty.com', 'role' => 'profissional']
                ];
            }

            echo json_encode([
                'success' => true,
                'usuarios' => $usuarios
            ]);
        } catch (Throwable $e) {
            error_log('Erro UsuariosController::listar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar usuários: ' . $e->getMessage()]);
        }
    }
}
?>
