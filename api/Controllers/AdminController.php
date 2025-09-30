<?php
class AdminController {
    public function dashboard() {
        header('Content-Type: application/json');

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            // Initialize default values
            $agendamentosHoje = 0;
            $agendamentosProximos = 0;
            $horariosLivresHoje = 0;
            $agendamentosRecentes = [];

            // Check if agendamentos table exists and get stats
            $stmt = $conn->prepare("SHOW TABLES LIKE 'agendamentos'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                // Agendamentos hoje
                $stmt = $conn->prepare('SELECT COUNT(*) as total FROM agendamentos WHERE data = CURDATE()');
                $stmt->execute();
                $agendamentosHoje = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

                // Agendamentos próximos 7 dias
                $stmt = $conn->prepare('SELECT COUNT(*) as total FROM agendamentos WHERE data BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)');
                $stmt->execute();
                $agendamentosProximos = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

                // Agendamentos recentes
                $stmt = $conn->prepare('
                    SELECT a.id, a.data, a.hora, a.status,
                           COALESCE(u.nome, "Cliente") as cliente_nome,
                           COALESCE(p.nome, "Procedimento") as procedimento_nome
                    FROM agendamentos a
                    LEFT JOIN usuarios u ON a.usuario_id = u.id
                    LEFT JOIN procedimentos p ON a.procedimento_id = p.id
                    WHERE a.data >= CURDATE()
                    ORDER BY a.data, a.hora
                    LIMIT 10
                ');
                $stmt->execute();
                $agendamentosRecentes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }

            // Check if horarios_disponiveis table exists
            $stmt = $conn->prepare("SHOW TABLES LIKE 'horarios_disponiveis'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                // Horários livres hoje
                $stmt = $conn->prepare('SELECT COUNT(*) as total FROM horarios_disponiveis WHERE data = CURDATE() AND status = "livre"');
                $stmt->execute();
                $horariosLivresHoje = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
            }

            echo json_encode([
                'success' => true,
                'stats' => [
                    'agendamentos_hoje' => (int)$agendamentosHoje,
                    'agendamentos_proximos' => (int)$agendamentosProximos,
                    'horarios_livres_hoje' => (int)$horariosLivresHoje
                ],
                'agendamentos_recentes' => $agendamentosRecentes
            ]);
        } catch (Throwable $e) {
            error_log('Erro AdminController::dashboard: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar dados do dashboard: ' . $e->getMessage()]);
        }
    }

    public function listarAgendamentos() {
        header('Content-Type: application/json');
        $data = $_GET['data'] ?? date('Y-m-d');

        // Log para debug
        error_log("AdminController::listarAgendamentos - Data recebida: " . $data);
        error_log("AdminController::listarAgendamentos - Data atual do servidor: " . date('Y-m-d'));

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            $agendamentos = [];

            // Check if agendamentos table exists
            $stmt = $conn->prepare("SHOW TABLES LIKE 'agendamentos'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $query = '
                    SELECT
                      a.id, a.data, a.hora, a.status, a.observacoes, a.criado_em, a.profissional_id,
                      COALESCE(u.nome, "Cliente") as cliente_nome,
                      COALESCE(u.email, "") as cliente_email,
                      COALESCE(p.nome, "Procedimento") as procedimento_nome,
                      COALESCE(prof.nome, "Profissional Não Atribuído") as profissional_nome,
                      a.opcao_cilios, a.cor_cilios, a.opcao_labios
                    FROM agendamentos a
                    LEFT JOIN usuarios u ON a.usuario_id = u.id
                    LEFT JOIN procedimentos p ON a.procedimento_id = p.id
                    LEFT JOIN profissionais prof ON a.profissional_id = prof.id
                    WHERE DATE(a.data) = DATE(:data)
                    ORDER BY a.hora
                ';

                error_log("AdminController::listarAgendamentos - Query: " . $query);
                error_log("AdminController::listarAgendamentos - Parâmetro data: " . $data);

                $stmt = $conn->prepare($query);
                $stmt->bindParam(':data', $data);
                $stmt->execute();
                $agendamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Log para debug (apenas em desenvolvimento)
                error_log("AdminController::listarAgendamentos - Data: $data, Agendamentos encontrados: " . count($agendamentos));
            }

            echo json_encode([
                'success' => true,
                'agendamentos' => $agendamentos
            ]);
        } catch (Throwable $e) {
            error_log('Erro AdminController::listarAgendamentos: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar agendamentos: ' . $e->getMessage()]);
        }
    }
}
