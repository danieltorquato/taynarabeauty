<?php
require_once __DIR__ . '/../Config/Timezone.php';
require_once __DIR__ . '/../Config/Database.php';

class HorariosController {
    public function listar() {
        header('Content-Type: application/json');
        $data = $_GET['data'] ?? date('Y-m-d');
        $profissionalId = $_GET['profissional_id'] ?? null;
        $procedimentoId = $_GET['procedimento_id'] ?? null;

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            $horarios = [];
            $sugestoes = [];

            // Verificar se é hoje e obter hora atual
            $hoje = date('Y-m-d');
            $horaAtual = date('H:i:s');
            $ehHoje = ($data === $hoje);

            // Check if horarios_disponiveis table exists
            $stmt = $conn->prepare("SHOW TABLES LIKE 'horarios_disponiveis'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                // Construir query baseada nos parâmetros fornecidos
                $whereConditions = ['data = :data', 'status = "livre"'];
                $params = [':data' => $data];

                // Se profissional foi especificado e não é 0, filtrar por ele
                if ($profissionalId && $profissionalId > 0) {
                    $whereConditions[] = 'profissional_id = :profissional_id';
                    $params[':profissional_id'] = $profissionalId;
                }

                // Lógica especial para combo (ID 5)
                if ($procedimentoId == 5) { // Combo
                    $horarios = $this->getHorariosCombo($conn, $data, $profissionalId);
                } else {
                    // Se procedimento foi especificado, usar validação de duração mínima
                    if ($procedimentoId && $procedimentoId > 0) {
                        $horarios = $this->getHorariosPorProcedimento($conn, $data, $profissionalId, $procedimentoId);
                    } else {
                        // Para procedimentos não especificados, usar lógica antiga
                        $sql = 'SELECT hora, status FROM horarios_disponiveis WHERE ' . implode(' AND ', $whereConditions) . ' ORDER BY hora';
                        $stmt = $conn->prepare($sql);

                        // Bind dos parâmetros
                        foreach ($params as $key => $value) {
                            $stmt->bindValue($key, $value);
                        }

                        $stmt->execute();
                        $horarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    }
                }

                // Filtrar horários de almoço se profissional foi especificado
                if ($profissionalId && $profissionalId > 0) {
                    $horarios = $this->filtrarHorariosAlmoco($conn, $horarios, $profissionalId);
                }

                // Filtrar horários passados se for hoje
                if ($ehHoje) {
                    $horarios = $this->filtrarHorariosPassados($horarios, $horaAtual);
                }

                // Gerar sugestões se não há horários disponíveis
                if (empty($horarios)) {
                    $sugestoes = $this->gerarSugestoes($conn, $data, $profissionalId, $procedimentoId);
                }

                // Se não há horários específicos para esta data, retornar array vazio
                // Não mais usar horários padrão automaticamente
            } else {
                // Se a tabela não existe, retornar array vazio
                $horarios = [];
                $sugestoes = $this->gerarSugestoes($conn, $data, $profissionalId, $procedimentoId);
            }

            echo json_encode([
                'success' => true,
                'horarios' => $horarios,
                'sugestoes' => $sugestoes
            ]);
        } catch (Throwable $e) {
            error_log('Erro HorariosController::listar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar horários: ' . $e->getMessage()]);
        }
    }

    public function liberarDia() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $data = $input['data'] ?? '';

        if (!$data) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Data é obrigatória']);
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
            $horarios = ['09:00:00', '10:30:00', '14:00:00', '16:30:00'];

            foreach ($horarios as $hora) {
                $stmt = $conn->prepare('INSERT IGNORE INTO horarios_disponiveis (data, hora, status) VALUES (:data, :hora, "livre")');
                $stmt->bindParam(':data', $data);
                $stmt->bindParam(':hora', $hora);
                $stmt->execute();
            }

            echo json_encode(['success' => true, 'message' => 'Horários liberados com sucesso']);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao liberar horários']);
        }
    }

    public function liberarSemana() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $dataInicio = $input['data_inicio'] ?? '';
        $dataFim = $input['data_fim'] ?? '';

        if (!$dataInicio || !$dataFim) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Datas de início e fim são obrigatórias']);
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
            $sql = "
                INSERT IGNORE INTO horarios_disponiveis (data, hora, status)
                SELECT DATE_ADD(:data_inicio, INTERVAL seq.n DAY) as data, h.hora, 'livre'
                FROM (
                    SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION
                    SELECT 4 UNION SELECT 5 UNION SELECT 6
                ) seq
                CROSS JOIN (
                    SELECT '09:00:00' as hora UNION ALL
                    SELECT '10:30:00' UNION ALL
                    SELECT '14:00:00' UNION ALL
                    SELECT '16:30:00'
                ) h
                WHERE DATE_ADD(:data_inicio, INTERVAL seq.n DAY) <= :data_fim
            ";

            $stmt = $conn->prepare($sql);
            $stmt->bindParam(':data_inicio', $dataInicio);
            $stmt->bindParam(':data_fim', $dataFim);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Semana liberada com sucesso']);
        } catch (Throwable $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao liberar semana']);
        }
    }

    public function liberarHorarioEspecifico() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $data = $input['data'] ?? null;
        $hora = $input['hora'] ?? null;

        if (!$data || !$hora) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Data e hora são obrigatórias']);
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
            $this->ensureTableExists($conn);

            // Add :00 seconds if not present
            if (strlen($hora) === 5) {
                $hora .= ':00';
            }

            $stmt = $conn->prepare('INSERT INTO horarios_disponiveis (data, hora, status) VALUES (:data, :hora, "livre") ON DUPLICATE KEY UPDATE status = "livre"');
            $stmt->bindParam(':data', $data);
            $stmt->bindParam(':hora', $hora);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Horário liberado com sucesso']);
        } catch (Throwable $e) {
            error_log('Erro HorariosController::liberarHorarioEspecifico: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao liberar horário: ' . $e->getMessage()]);
        }
    }

    public function bloquearHorarioEspecifico() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $data = $input['data'] ?? null;
        $hora = $input['hora'] ?? null;

        if (!$data || !$hora) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Data e hora são obrigatórias']);
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
            $this->ensureTableExists($conn);

            // Add :00 seconds if not present
            if (strlen($hora) === 5) {
                $hora .= ':00';
            }

            // Remove from available hours (blocking it)
            $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE data = :data AND hora = :hora');
            $stmt->bindParam(':data', $data);
            $stmt->bindParam(':hora', $hora);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Horário bloqueado com sucesso']);
        } catch (Throwable $e) {
            error_log('Erro HorariosController::bloquearHorarioEspecifico: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao bloquear horário: ' . $e->getMessage()]);
        }
    }

    public function bloquearDia() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $data = $input['data'] ?? null;

        if (!$data) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Data é obrigatória']);
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
            $this->ensureTableExists($conn);

            // Remove all available hours for this date
            $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE data = :data');
            $stmt->bindParam(':data', $data);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Todos os horários foram bloqueados para ' . $data]);
        } catch (Throwable $e) {
            error_log('Erro HorariosController::bloquearDia: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao bloquear horários: ' . $e->getMessage()]);
        }
    }

    public function salvarBatch() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $data = $input['data'] ?? null;
        $alteracoes = $input['alteracoes'] ?? [];
        $profissionalId = $input['profissional_id'] ?? null;
        $procedimentoId = $input['procedimento_id'] ?? null;

        if (!$data || empty($alteracoes)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Data e alterações são obrigatórias']);
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
            $this->ensureTableExists($conn);

            // Start transaction
            $conn->beginTransaction();

            foreach ($alteracoes as $alteracao) {
                $hora = $alteracao['time'];
                $status = $alteracao['status'];

                // Add :00 seconds if not present
                if (strlen($hora) === 5) {
                    $hora .= ':00';
                }

                // Se está tentando liberar um horário e há profissional selecionado,
                // verificar se não está no horário de almoço
                if ($status === 'livre' && $profissionalId) {
                    if ($this->isHorarioAlmoco($conn, $hora, $profissionalId)) {
                        // Pular este horário, pois está no período de almoço
                        continue;
                    }
                }

                if ($status === 'livre') {
                    // Insert or update to 'livre' - incluir profissional_id se fornecido
                    if ($profissionalId) {
                        if ($procedimentoId) {
                            // Procedimento específico selecionado
                            $stmt = $conn->prepare('INSERT INTO horarios_disponiveis (data, hora, profissional_id, status, procedimento_id) VALUES (:data, :hora, :profissional_id, "livre", :procedimento_id) ON DUPLICATE KEY UPDATE status = "livre", procedimento_id = :procedimento_id');
                            $stmt->bindParam(':data', $data);
                            $stmt->bindParam(':hora', $hora);
                            $stmt->bindParam(':profissional_id', $profissionalId);
                            $stmt->bindParam(':procedimento_id', $procedimentoId);
                            $stmt->execute();
                        } else {
                            // "Todos" selecionado - liberar para cílios (ID 3) e lábios (ID 4)
                            $procedimentosTodos = [3, 4]; // Cílios e Lábios
                            foreach ($procedimentosTodos as $procId) {
                                $stmt = $conn->prepare('INSERT INTO horarios_disponiveis (data, hora, profissional_id, status, procedimento_id) VALUES (:data, :hora, :profissional_id, "livre", :procedimento_id) ON DUPLICATE KEY UPDATE status = "livre", procedimento_id = :procedimento_id');
                                $stmt->bindParam(':data', $data);
                                $stmt->bindParam(':hora', $hora);
                                $stmt->bindParam(':profissional_id', $profissionalId);
                                $stmt->bindParam(':procedimento_id', $procId);
                                $stmt->execute();
                            }
                        }
                    } else {
                        if ($procedimentoId) {
                            // Procedimento específico sem profissional
                            $stmt = $conn->prepare('INSERT INTO horarios_disponiveis (data, hora, status, procedimento_id) VALUES (:data, :hora, "livre", :procedimento_id) ON DUPLICATE KEY UPDATE status = "livre", procedimento_id = :procedimento_id');
                            $stmt->bindParam(':data', $data);
                            $stmt->bindParam(':hora', $hora);
                            $stmt->bindParam(':procedimento_id', $procedimentoId);
                            $stmt->execute();
                        } else {
                            // "Todos" selecionado sem profissional - liberar para cílios (ID 3) e lábios (ID 4)
                            $procedimentosTodos = [3, 4]; // Cílios e Lábios
                            foreach ($procedimentosTodos as $procId) {
                                $stmt = $conn->prepare('INSERT INTO horarios_disponiveis (data, hora, status, procedimento_id) VALUES (:data, :hora, "livre", :procedimento_id) ON DUPLICATE KEY UPDATE status = "livre", procedimento_id = :procedimento_id');
                                $stmt->bindParam(':data', $data);
                                $stmt->bindParam(':hora', $hora);
                                $stmt->bindParam(':procedimento_id', $procId);
                                $stmt->execute();
                            }
                        }
                    }
                } else if ($status === 'bloqueado') {
                    // Remove from available hours (blocking it) - incluir profissional_id se fornecido
                    if ($profissionalId) {
                        if ($procedimentoId) {
                            // Bloquear procedimento específico para profissional específico
                            $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE data = :data AND hora = :hora AND profissional_id = :profissional_id AND procedimento_id = :procedimento_id');
                            $stmt->bindParam(':data', $data);
                            $stmt->bindParam(':hora', $hora);
                            $stmt->bindParam(':profissional_id', $profissionalId);
                            $stmt->bindParam(':procedimento_id', $procedimentoId);
                            $stmt->execute();
                        } else {
                            // "Todos" selecionado - bloquear para cílios (ID 3) e lábios (ID 4) para profissional específico
                            $procedimentosTodos = [3, 4]; // Cílios e Lábios
                            foreach ($procedimentosTodos as $procId) {
                                $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE data = :data AND hora = :hora AND profissional_id = :profissional_id AND procedimento_id = :procedimento_id');
                                $stmt->bindParam(':data', $data);
                                $stmt->bindParam(':hora', $hora);
                                $stmt->bindParam(':profissional_id', $profissionalId);
                                $stmt->bindParam(':procedimento_id', $procId);
                                $stmt->execute();
                            }
                        }
                    } else {
                        if ($procedimentoId) {
                            // Bloquear procedimento específico sem profissional
                            $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE data = :data AND hora = :hora AND procedimento_id = :procedimento_id');
                            $stmt->bindParam(':data', $data);
                            $stmt->bindParam(':hora', $hora);
                            $stmt->bindParam(':procedimento_id', $procedimentoId);
                            $stmt->execute();
                        } else {
                            // "Todos" selecionado sem profissional - bloquear para cílios (ID 3) e lábios (ID 4)
                            $procedimentosTodos = [3, 4]; // Cílios e Lábios
                            foreach ($procedimentosTodos as $procId) {
                                $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE data = :data AND hora = :hora AND procedimento_id = :procedimento_id');
                                $stmt->bindParam(':data', $data);
                                $stmt->bindParam(':hora', $hora);
                                $stmt->bindParam(':procedimento_id', $procId);
                                $stmt->execute();
                            }
                        }
                    }
                }
            }

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => count($alteracoes) . ' alterações salvas com sucesso',
                'alteracoes_processadas' => count($alteracoes)
            ]);
        } catch (Throwable $e) {
            $conn->rollback();
            error_log('Erro HorariosController::salvarBatch: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao salvar alterações: ' . $e->getMessage()]);
        }
    }

    private function getHorariosCombo($conn, $data, $profissionalId) {
        $horariosCombo = [];

        // Obter duração mínima do combo
        $duracaoMinimaCombo = $this->getDuracaoMinimaProcedimento($conn, 5); // Combo ID 5

        // Buscar horários disponíveis para cílios (ID 3)
        $horariosCilios = $this->getHorariosPorProcedimento($conn, $data, $profissionalId, 3);

        // Buscar horários disponíveis para lábios (ID 4)
        $horariosLabios = $this->getHorariosPorProcedimento($conn, $data, $profissionalId, 4);

        // Se não há horários específicos para combo, mas há para cílios e lábios,
        // usar a interseção dos horários disponíveis
        if (empty($horariosCilios) && empty($horariosLabios)) {
            // Se não há horários para nenhum dos procedimentos individuais,
            // buscar horários gerais (sem procedimento específico)
            $horariosGerais = $this->getHorariosGerais($conn, $data, $profissionalId);

            // Para horários gerais, verificar se têm duração suficiente para combo
            foreach ($horariosGerais as $horario) {
                if ($this->verificarDuracaoMinima($conn, $data, $horario['hora'], $profissionalId, $duracaoMinimaCombo)) {
                    if ($this->verificarDisponibilidadeCombo($conn, $data, $horario['hora'], $profissionalId)) {
                        $horariosCombo[] = [
                            'hora' => $horario['hora'],
                            'status' => 'livre'
                        ];
                    }
                }
            }
        } else {
            // Encontrar horários que estão disponíveis para AMBOS os procedimentos
            foreach ($horariosCilios as $horarioCilios) {
                foreach ($horariosLabios as $horarioLabios) {
                    if ($horarioCilios['hora'] === $horarioLabios['hora']) {
                        // Verificar se o horário tem duração mínima suficiente para combo
                        if ($this->verificarDuracaoMinima($conn, $data, $horarioCilios['hora'], $profissionalId, $duracaoMinimaCombo)) {
                            // Verificar se há conflitos com agendamentos existentes
                            if ($this->verificarDisponibilidadeCombo($conn, $data, $horarioCilios['hora'], $profissionalId)) {
                                $horariosCombo[] = [
                                    'hora' => $horarioCilios['hora'],
                                    'status' => 'livre'
                                ];
                            }
                        }
                    }
                }
            }
        }

        return $horariosCombo;
    }

    // Novo método para buscar horários gerais (sem procedimento específico)
    private function getHorariosGerais($conn, $data, $profissionalId) {
        $whereConditions = ['data = :data', 'status = "livre"'];
        $params = [':data' => $data];

        if ($profissionalId && $profissionalId > 0) {
            $whereConditions[] = 'profissional_id = :profissional_id';
            $params[':profissional_id'] = $profissionalId;
        }

        $sql = 'SELECT hora, status FROM horarios_disponiveis WHERE ' . implode(' AND ', $whereConditions) . ' ORDER BY hora';
        $stmt = $conn->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getHorariosPorProcedimento($conn, $data, $profissionalId, $procedimentoId) {
        $whereConditions = ['data = :data', 'status = "livre"', 'procedimento_id = :procedimento_id'];
        $params = [':data' => $data, ':procedimento_id' => $procedimentoId];

        if ($profissionalId && $profissionalId > 0) {
            $whereConditions[] = 'profissional_id = :profissional_id';
            $params[':profissional_id'] = $profissionalId;
        }

        $sql = 'SELECT hora, status FROM horarios_disponiveis WHERE ' . implode(' AND ', $whereConditions) . ' ORDER BY hora';
        $stmt = $conn->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        $horarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Filtrar horários que respeitam a duração mínima do procedimento
        $horariosValidos = [];
        $duracaoMinima = $this->getDuracaoMinimaProcedimento($conn, $procedimentoId);

        foreach ($horarios as $horario) {
            if ($this->verificarDuracaoMinima($conn, $data, $horario['hora'], $profissionalId, $duracaoMinima)) {
                $horariosValidos[] = $horario;
            }
        }

        return $horariosValidos;
    }

    private function verificarDisponibilidadeCombo($conn, $data, $hora, $profissionalId) {
        // Verificar se há agendamentos existentes que conflitariam com o combo
        // Combo precisa de tempo suficiente para ambos os procedimentos

        try {
            // Converter hora do combo para minutos
            $horaComboMinutos = $this->converterHorarioParaMinutos($hora);

            // Duração estimada do combo (em minutos) - pode ser ajustada conforme necessário
            $duracaoCombo = 120; // 2 horas para combo (cílios + lábios)

            $fimCombo = $horaComboMinutos + $duracaoCombo;

            // Buscar apenas agendamentos que podem conflitar (otimização)
            // Busca agendamentos que começam antes do fim do combo e terminam depois do início do combo
            $stmt = $conn->prepare('
                SELECT a.hora, a.duracao, p.nome as procedimento_nome
                FROM agendamentos a
                LEFT JOIN procedimentos p ON a.procedimento_id = p.id
                WHERE a.data = :data
                AND a.profissional_id = :profissional_id
                AND a.status IN ("pendente", "confirmado")
                AND (
                    (TIME_TO_SEC(a.hora) / 60) < :fim_combo_minutos
                    AND
                    (TIME_TO_SEC(a.hora) / 60) + COALESCE(a.duracao, 60) > :inicio_combo_minutos
                )
            ');
            $stmt->bindParam(':data', $data);
            $stmt->bindParam(':profissional_id', $profissionalId);
            $stmt->bindValue(':fim_combo_minutos', $fimCombo);
            $stmt->bindValue(':inicio_combo_minutos', $horaComboMinutos);
            $stmt->execute();
            $agendamentosConflitantes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Se encontrou agendamentos conflitantes, o horário não está disponível
            if (count($agendamentosConflitantes) > 0) {
                return false;
            }

            return true;

        } catch (Throwable $e) {
            error_log('Erro ao verificar disponibilidade combo: ' . $e->getMessage());
            return false;
        }
    }

    private function getHorariosPadrao() {
        $horarios = [];

        // Horários de 8:00 às 18:00, de 15 em 15 minutos
        $horaInicio = 8; // 8:00
        $horaFim = 18;   // 18:00

        for ($hora = $horaInicio; $hora < $horaFim; $hora++) {
            for ($minuto = 0; $minuto < 60; $minuto += 15) {
                $timeString = sprintf('%02d:%02d:00', $hora, $minuto);
                $horarios[] = ['hora' => $timeString, 'status' => 'livre'];
            }
        }

        return $horarios;
    }

    private function ensureTableExists($conn) {
        $stmt = $conn->prepare("SHOW TABLES LIKE 'horarios_disponiveis'");
        $stmt->execute();
        if ($stmt->rowCount() === 0) {
            $createTable = "
                CREATE TABLE horarios_disponiveis (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    data DATE NOT NULL,
                    hora TIME NOT NULL,
                    profissional_id INT UNSIGNED NULL,
                    procedimento_id INT UNSIGNED NULL,
                    status ENUM('livre','reservado','bloqueado') NOT NULL DEFAULT 'livre',
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uniq_data_hora_prof_proc (data, hora, profissional_id, procedimento_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ";
            $conn->exec($createTable);
        } else {
            // Verificar se a coluna procedimento_id existe, se não, adicionar
            $stmt = $conn->prepare("SHOW COLUMNS FROM horarios_disponiveis LIKE 'procedimento_id'");
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                $conn->exec("ALTER TABLE horarios_disponiveis ADD COLUMN procedimento_id INT UNSIGNED NULL AFTER profissional_id");
            }

            // Verificar se a constraint única inclui procedimento_id, se não, recriar
            $stmt = $conn->prepare("SHOW INDEX FROM horarios_disponiveis WHERE Key_name = 'uniq_data_hora_prof'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                // Remover constraint antiga e criar nova
                $conn->exec("ALTER TABLE horarios_disponiveis DROP INDEX uniq_data_hora_prof");
                $conn->exec("ALTER TABLE horarios_disponiveis ADD UNIQUE KEY uniq_data_hora_prof_proc (data, hora, profissional_id, procedimento_id)");
            }
        }
    }

    private function filtrarHorariosAlmoco($conn, $horarios, $profissionalId) {
        try {
            // Buscar horário de almoço do profissional
            $stmt = $conn->prepare("SHOW TABLES LIKE 'profissionais'");
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                return $horarios; // Se tabela não existe, retornar sem filtrar
            }

            $stmt = $conn->prepare('SELECT almoco_inicio, almoco_fim FROM profissionais WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $profissionalId);
            $stmt->execute();
            $profissional = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$profissional || !$profissional['almoco_inicio'] || !$profissional['almoco_fim']) {
                return $horarios; // Se não tem horário de almoço definido, retornar sem filtrar
            }

            $almocoInicio = $profissional['almoco_inicio'];
            $almocoFim = $profissional['almoco_fim'];

            // Filtrar horários que estão fora do período de almoço
            $horariosFiltrados = array_filter($horarios, function($horario) use ($almocoInicio, $almocoFim) {
                $hora = $horario['hora'];

                // Converter para minutos para facilitar comparação
                $horaMinutos = $this->converterHorarioParaMinutos($hora);
                $almocoInicioMinutos = $this->converterHorarioParaMinutos($almocoInicio);
                $almocoFimMinutos = $this->converterHorarioParaMinutos($almocoFim);

                // Retornar true apenas se o horário NÃO estiver no período de almoço
                return $horaMinutos < $almocoInicioMinutos || $horaMinutos >= $almocoFimMinutos;
            });

            return array_values($horariosFiltrados); // Reindexar array
        } catch (Throwable $e) {
            error_log('Erro ao filtrar horários de almoço: ' . $e->getMessage());
            return $horarios; // Em caso de erro, retornar horários sem filtrar
        }
    }

    private function converterHorarioParaMinutos($horario) {
        $partes = explode(':', $horario);
        $horas = (int)$partes[0];
        $minutos = (int)$partes[1];
        return $horas * 60 + $minutos;
    }

    private function isHorarioAlmoco($conn, $hora, $profissionalId) {
        try {
            // Buscar horário de almoço do profissional
            $stmt = $conn->prepare('SELECT almoco_inicio, almoco_fim FROM profissionais WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $profissionalId);
            $stmt->execute();
            $profissional = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$profissional || !$profissional['almoco_inicio'] || !$profissional['almoco_fim']) {
                return false; // Não tem horário de almoço configurado
            }

            $horaMinutos = $this->converterHorarioParaMinutos($hora);
            $almocoInicioMinutos = $this->converterHorarioParaMinutos($profissional['almoco_inicio']);
            $almocoFimMinutos = $this->converterHorarioParaMinutos($profissional['almoco_fim']);

            // Retorna true se o horário está dentro do período de almoço
            return $horaMinutos >= $almocoInicioMinutos && $horaMinutos < $almocoFimMinutos;
        } catch (Throwable $e) {
            error_log('Erro ao verificar horário de almoço: ' . $e->getMessage());
            return false;
        }
    }

    private function getDuracaoMinimaProcedimento($conn, $procedimentoId) {
        try {
            $stmt = $conn->prepare('SELECT duracao_min FROM procedimentos WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $procedimentoId);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            return $result ? (int)$result['duracao_min'] : 30; // Default 30 minutos
        } catch (Throwable $e) {
            error_log('Erro ao buscar duração mínima: ' . $e->getMessage());
            return 30; // Default 30 minutos
        }
    }

    private function verificarDuracaoMinima($conn, $data, $hora, $profissionalId, $duracaoMinima) {
        try {
            // Converter hora para minutos
            $horaInicioMinutos = $this->converterHorarioParaMinutos($hora);
            $horaFimMinutos = $horaInicioMinutos + $duracaoMinima;

            // Verificar se há agendamentos que conflitariam com a duração mínima
            $stmt = $conn->prepare('
                SELECT a.hora, a.duracao, p.nome as procedimento_nome
                FROM agendamentos a
                LEFT JOIN procedimentos p ON a.procedimento_id = p.id
                WHERE a.data = :data
                AND a.profissional_id = :profissional_id
                AND a.status IN ("pendente", "confirmado")
                AND (
                    (TIME_TO_SEC(a.hora) / 60) < :hora_fim_minutos
                    AND
                    (TIME_TO_SEC(a.hora) / 60) + COALESCE(a.duracao, 60) > :hora_inicio_minutos
                )
            ');
            $stmt->bindParam(':data', $data);
            $stmt->bindParam(':profissional_id', $profissionalId);
            $stmt->bindValue(':hora_fim_minutos', $horaFimMinutos);
            $stmt->bindValue(':hora_inicio_minutos', $horaInicioMinutos);
            $stmt->execute();
            $agendamentosConflitantes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Se encontrou agendamentos conflitantes, o horário não tem duração mínima suficiente
            return count($agendamentosConflitantes) === 0;

        } catch (Throwable $e) {
            error_log('Erro ao verificar duração mínima: ' . $e->getMessage());
            return false; // Em caso de erro, não permitir
        }
    }

    private function filtrarHorariosPassados($horarios, $horaAtual) {
        $horariosValidos = [];

        foreach ($horarios as $horario) {
            $horaHorario = $horario['hora'];

            // Se a hora do horário é posterior à hora atual, incluir
            if ($horaHorario > $horaAtual) {
                $horariosValidos[] = $horario;
            }
        }

        return $horariosValidos;
    }

    private function gerarSugestoes($conn, $data, $profissionalId, $procedimentoId) {
        $sugestoes = [];

        try {
            // Verificar se é problema de horário (todos os horários passados) ou agenda do profissional
            $hoje = date('Y-m-d');
            $horaAtual = date('H:i:s');
            $ehHoje = ($data === $hoje);

            if ($ehHoje) {
                // Se é hoje, verificar se há horários futuros disponíveis
                $stmt = $conn->prepare('
                    SELECT COUNT(*) as total
                    FROM horarios_disponiveis
                    WHERE data = :data
                    AND status = "livre"
                    AND hora > :hora_atual
                ');
                $stmt->bindValue(':data', $data);
                $stmt->bindValue(':hora_atual', $horaAtual);
                $stmt->execute();
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($result['total'] > 0) {
                    // Há horários futuros, problema é agenda do profissional
                    $sugestoes = $this->sugerirOutrosProfissionais($conn, $data, $procedimentoId);
                } else {
                    // Não há horários futuros, sugerir próxima data
                    $sugestoes = $this->sugerirProximaData($conn, $data, $profissionalId, $procedimentoId);
                }
            } else {
                // Se não é hoje, verificar se há horários disponíveis
                $stmt = $conn->prepare('
                    SELECT COUNT(*) as total
                    FROM horarios_disponiveis
                    WHERE data = :data
                    AND status = "livre"
                ');
                $stmt->bindValue(':data', $data);
                $stmt->execute();
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($result['total'] > 0) {
                    // Há horários, problema é agenda do profissional
                    $sugestoes = $this->sugerirOutrosProfissionais($conn, $data, $procedimentoId);
                } else {
                    // Não há horários, sugerir próxima data
                    $sugestoes = $this->sugerirProximaData($conn, $data, $profissionalId, $procedimentoId);
                }
            }

        } catch (Throwable $e) {
            error_log('Erro ao gerar sugestões: ' . $e->getMessage());
        }

        return $sugestoes;
    }

    private function sugerirProximaData($conn, $dataAtual, $profissionalId, $procedimentoId) {
        $sugestoes = [];

        try {
            // Buscar próximas 7 datas com horários disponíveis
            for ($i = 1; $i <= 7; $i++) {
                $proximaData = date('Y-m-d', strtotime($dataAtual . " +{$i} days"));

                $stmt = $conn->prepare('
                    SELECT COUNT(*) as total
                    FROM horarios_disponiveis
                    WHERE data = :data
                    AND status = "livre"
                ');
                $stmt->bindValue(':data', $proximaData);
                $stmt->execute();
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($result['total'] > 0) {
                    $sugestoes[] = [
                        'tipo' => 'proxima_data',
                        'data' => $proximaData,
                        'data_formatada' => date('d/m/Y', strtotime($proximaData)),
                        'mensagem' => "Próxima data disponível: " . date('d/m/Y', strtotime($proximaData))
                    ];
                    break; // Encontrou a primeira data disponível
                }
            }

        } catch (Throwable $e) {
            error_log('Erro ao sugerir próxima data: ' . $e->getMessage());
        }

        return $sugestoes;
    }

    private function sugerirOutrosProfissionais($conn, $data, $procedimentoId) {
        $sugestoes = [];

        try {
            // Buscar outros profissionais que têm competência e horários disponíveis
            $stmt = $conn->prepare('
                SELECT DISTINCT p.id, p.nome, COUNT(h.id) as horarios_disponiveis
                FROM profissionais p
                INNER JOIN profissional_especializacoes pe ON p.id = pe.profissional_id
                LEFT JOIN horarios_disponiveis h ON p.id = h.profissional_id
                    AND h.data = :data
                    AND h.status = "livre"
                WHERE pe.procedimento_id = :procedimento_id
                AND p.ativo = 1
                GROUP BY p.id, p.nome
                HAVING horarios_disponiveis > 0
                ORDER BY horarios_disponiveis DESC
            ');
            $stmt->bindValue(':data', $data);
            $stmt->bindValue(':procedimento_id', $procedimentoId);
            $stmt->execute();
            $profissionais = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($profissionais as $profissional) {
                $sugestoes[] = [
                    'tipo' => 'outro_profissional',
                    'profissional_id' => $profissional['id'],
                    'profissional_nome' => $profissional['nome'],
                    'horarios_disponiveis' => $profissional['horarios_disponiveis'],
                    'mensagem' => "Outro profissional disponível: {$profissional['nome']} ({$profissional['horarios_disponiveis']} horários)"
                ];
            }

        } catch (Throwable $e) {
            error_log('Erro ao sugerir outros profissionais: ' . $e->getMessage());
        }

        return $sugestoes;
    }
}
