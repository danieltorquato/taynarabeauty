<?php
require_once __DIR__ . '/../Config/Timezone.php';
require_once __DIR__ . '/../Config/Database.php';

class MeusAgendamentosController {
    public function listar() {
        header('Content-Type: application/json');

        // Obter token do header
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Token não fornecido']);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            // TODO: Validar token e obter usuario_id
            // Por enquanto, vamos usar um ID fixo para teste
            $usuario_id = 1;
            $role = 'cliente'; // Pode ser: cliente, profissional, admin

            // Buscar role do usuário (simulado)
            $stmt = $conn->prepare('SELECT id, role FROM usuarios WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $usuario_id);
            $stmt->execute();
            $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$usuario) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
                return;
            }

            $role = $usuario['role'];
            $agendamentos = [];

            // Check if agendamentos table exists
            $stmt = $conn->prepare("SHOW TABLES LIKE 'agendamentos'");
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                echo json_encode(['success' => true, 'agendamentos' => []]);
                return;
            }

            if ($role === 'cliente') {
                // Cliente: ver apenas seus próprios agendamentos
                $stmt = $conn->prepare('
                    SELECT
                        a.id, a.data, a.hora, a.status, a.observacoes, a.criado_em,
                        a.procedimento_id, a.profissional_id,
                        COALESCE(p.nome, "Procedimento") as procedimento_nome,
                        COALESCE(prof.nome, "Profissional") as profissional_nome,
                        a.opcao_cilios, a.cor_cilios, a.opcao_labios
                    FROM agendamentos a
                    LEFT JOIN procedimentos p ON a.procedimento_id = p.id
                    LEFT JOIN profissionais prof ON a.profissional_id = prof.id
                    WHERE a.usuario_id = :usuario_id
                    ORDER BY a.data DESC, a.hora DESC
                ');
                $stmt->bindParam(':usuario_id', $usuario_id);
            } elseif ($role === 'profissional') {
                // Profissional: ver agendamentos onde ele é o profissional
                // Primeiro buscar o profissional_id associado a este usuario_id
                $stmt = $conn->prepare('SELECT id FROM profissionais WHERE usuario_id = :usuario_id LIMIT 1');
                $stmt->bindParam(':usuario_id', $usuario_id);
                $stmt->execute();
                $profissional = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$profissional) {
                    echo json_encode(['success' => true, 'agendamentos' => []]);
                    return;
                }

                $profissional_id = $profissional['id'];

                $stmt = $conn->prepare('
                    SELECT
                        a.id, a.data, a.hora, a.status, a.observacoes, a.criado_em,
                        a.procedimento_id, a.profissional_id,
                        COALESCE(u.nome, "Cliente") as cliente_nome,
                        COALESCE(u.email, "") as cliente_email,
                        COALESCE(p.nome, "Procedimento") as procedimento_nome,
                        a.opcao_cilios, a.cor_cilios, a.opcao_labios
                    FROM agendamentos a
                    LEFT JOIN usuarios u ON a.usuario_id = u.id
                    LEFT JOIN procedimentos p ON a.procedimento_id = p.id
                    WHERE a.profissional_id = :profissional_id
                    ORDER BY a.data DESC, a.hora DESC
                ');
                $stmt->bindParam(':profissional_id', $profissional_id);
            } else {
                // Admin: ver todos os agendamentos
                $stmt = $conn->prepare('
                    SELECT
                        a.id, a.data, a.hora, a.status, a.observacoes, a.criado_em,
                        a.procedimento_id, a.profissional_id,
                        COALESCE(u.nome, "Cliente") as cliente_nome,
                        COALESCE(u.email, "") as cliente_email,
                        COALESCE(p.nome, "Procedimento") as procedimento_nome,
                        COALESCE(prof.nome, "Profissional") as profissional_nome,
                        a.opcao_cilios, a.cor_cilios, a.opcao_labios
                    FROM agendamentos a
                    LEFT JOIN usuarios u ON a.usuario_id = u.id
                    LEFT JOIN procedimentos p ON a.procedimento_id = p.id
                    LEFT JOIN profissionais prof ON a.profissional_id = prof.id
                    ORDER BY a.data DESC, a.hora DESC
                ');
            }

            $stmt->execute();
            $agendamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'agendamentos' => $agendamentos,
                'role' => $role
            ]);
        } catch (Throwable $e) {
            error_log('Erro MeusAgendamentosController::listar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar agendamentos: ' . $e->getMessage()]);
        }
    }

    public function cancelar($id) {
        header('Content-Type: application/json');

        // Obter token do header
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

        if (!$token) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Token não fornecido']);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            $stmt = $conn->prepare('UPDATE agendamentos SET status = "cancelado" WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Agendamento cancelado com sucesso'
            ]);
        } catch (Throwable $e) {
            error_log('Erro MeusAgendamentosController::cancelar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao cancelar agendamento: ' . $e->getMessage()]);
        }
    }
}
