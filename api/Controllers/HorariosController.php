<?php
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

                // Se procedimento foi especificado, filtrar por ele
                if ($procedimentoId && $procedimentoId > 0) {
                    $whereConditions[] = 'procedimento_id = :procedimento_id';
                    $params[':procedimento_id'] = $procedimentoId;
                }

                $sql = 'SELECT hora, status FROM horarios_disponiveis WHERE ' . implode(' AND ', $whereConditions) . ' ORDER BY hora';
                $stmt = $conn->prepare($sql);

                // Bind dos parâmetros
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value);
                }

                $stmt->execute();
                $horarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Filtrar horários de almoço se profissional foi especificado
                if ($profissionalId && $profissionalId > 0) {
                    $horarios = $this->filtrarHorariosAlmoco($conn, $horarios, $profissionalId);
                }

                // Se não há horários específicos para esta data, retornar array vazio
                // Não mais usar horários padrão automaticamente
            } else {
                // Se a tabela não existe, retornar array vazio
                $horarios = [];
            }

            echo json_encode([
                'success' => true,
                'horarios' => $horarios
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
}
