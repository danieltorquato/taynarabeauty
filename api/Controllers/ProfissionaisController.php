<?php
require_once __DIR__ . '/../Config/Database.php';

class ProfissionaisController {
    public function listar() {
        header('Content-Type: application/json');
        $procedimentoId = $_GET['procedimento_id'] ?? null;

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            $profissionais = [];

            // Check if profissionais table exists
            $stmt = $conn->prepare("SHOW TABLES LIKE 'profissionais'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                if ($procedimentoId) {
                    // Filtrar profissionais por especialização baseada no procedimento
                    $profissionais = $this->getProfissionaisPorProcedimento($conn, $procedimentoId);
                } else {
                    // Buscar todos os profissionais ativos
                    $stmt = $conn->prepare('SELECT p.id, p.nome, p.usuario_id, u.nome as usuario_nome FROM profissionais p LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE p.ativo = 1 ORDER BY p.nome');
                    $stmt->execute();
                    $profissionais = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }

                // Adicionar fotos de exemplo
                foreach ($profissionais as &$prof) {
                    if ($prof['id'] == 1) {
                        $prof['foto'] = 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face';
                    } elseif ($prof['id'] == 2) {
                        $prof['foto'] = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face';
                    }
                }
            } else {
                // Create demo data if table doesn't exist
                $profissionais = $this->getProfissionaisDemo($procedimentoId);
            }

            echo json_encode([
                'success' => true,
                'profissionais' => $profissionais
            ]);
        } catch (Throwable $e) {
            error_log('Erro ProfissionaisController::listar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar profissionais: ' . $e->getMessage()]);
        }
    }

    private function getProfissionaisPorProcedimento($conn, $procedimentoId) {
        // Buscar profissionais dinamicamente baseado na tabela de especializações
        $profissionais = [];

        // Verificar se tabela de especializações existe
        $stmt = $conn->prepare("SHOW TABLES LIKE 'profissional_especializacoes'");
        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            // Buscar profissionais especializados no procedimento
            $stmt = $conn->prepare('
                SELECT p.id, p.nome, p.usuario_id, u.nome as usuario_nome
                FROM profissionais p
                LEFT JOIN usuarios u ON p.usuario_id = u.id
                INNER JOIN profissional_especializacoes pe ON p.id = pe.profissional_id
                WHERE pe.procedimento_id = :procedimento_id
                AND p.ativo = 1
                ORDER BY p.nome
            ');
            $stmt->bindParam(':procedimento_id', $procedimentoId);
            $stmt->execute();
            $profissionais = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // Fallback para lógica hardcoded se tabela não existir
            $profissionais = $this->getProfissionaisHardcoded($conn, $procedimentoId);
        }

        return $profissionais;
    }

    private function getProfissionaisHardcoded($conn, $procedimentoId) {
        // Lógica de especialização hardcoded como fallback
        $profissionais = [];

        // Taynara (ID 1) - Especialista em cílios (procedimento_id 1, 2, 3, 5, 6)
        if (in_array($procedimentoId, [1, 2, 3, 5, 6])) {
            $stmt = $conn->prepare('SELECT p.id, p.nome, p.usuario_id, u.nome as usuario_nome FROM profissionais p LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = 1 AND p.ativo = 1');
            $stmt->execute();
            $taynara = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($taynara) {
                $profissionais[] = $taynara;
            }
        }

        // Mayara (ID 2) - Especialista em lábios (procedimento_id 4)
        if (in_array($procedimentoId, [4])) {
            $stmt = $conn->prepare('SELECT p.id, p.nome, p.usuario_id, u.nome as usuario_nome FROM profissionais p LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = 2 AND p.ativo = 1');
            $stmt->execute();
            $mayara = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($mayara) {
                $profissionais[] = $mayara;
            }
        }

        return $profissionais;
    }

    private function getProfissionaisDemo($procedimentoId) {
        $profissionais = [];

        // Taynara (ID 1) - Especialista em cílios (procedimento_id 1, 2, 3, 4, 5, 6)
        if (!$procedimentoId || in_array($procedimentoId, [1, 2, 3, 4, 5, 6])) {
            $profissionais[] = ['id' => 1, 'nome' => 'Taynara Casagrande', 'usuario_id' => 3, 'usuario_nome' => 'Taynara'];
        }

        // Mayara (ID 2) - Especialista em lábios (procedimento_id 4)
        if (!$procedimentoId || in_array($procedimentoId, [4])) {
            $profissionais[] = ['id' => 2, 'nome' => 'Mayara Casagrande', 'usuario_id' => 4, 'usuario_nome' => 'Mayara'];
        }

        return $profissionais;
    }
}
?>
