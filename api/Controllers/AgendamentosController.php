<?php
class AgendamentosController {
    public function create() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        error_log('Dados recebidos no AgendamentosController: ' . json_encode($input));

        $nome = trim($input['nome'] ?? '');
        $email = trim($input['email'] ?? '');
        $telefone = trim($input['telefone'] ?? '');
        $procedimento_id = (int)($input['procedimento_id'] ?? 0);
        $profissional_id = (int)($input['profissional_id'] ?? 0);
        $data = trim($input['data'] ?? '');       // YYYY-MM-DD
        $hora = trim($input['hora'] ?? '');       // HH:MM
        $observacoes = trim($input['observacoes'] ?? '');
        $opcao_cilios = trim($input['opcao_cilios'] ?? '');
        $cor_cilios = trim($input['cor_cilios'] ?? '');
        $opcao_labios = trim($input['opcao_labios'] ?? '');

        if ($procedimento_id === 0 || $data === '' || $hora === '') {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Preencha procedimento, data e horário']);
            return;
        }

        // Verificar se já existe agendamento ativo para o usuário
        $usuario_id = 1; // TODO: get from JWT token
        $db = new Database();
        $conn = $db->connect();
        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        // Verificar conflitos de horários antes de criar o agendamento
        // (A verificação será feita após escolher o profissional, se necessário)

        // Se profissional_id = 0, significa "sem preferência" - usar sistema de fila inteligente
        if ($profissional_id === 0) {
            $profissional_id = $this->escolherProfissionalPorFila($conn, $data, $hora, $procedimento_id);
            if (!$profissional_id) {
                http_response_code(422);
                echo json_encode(['success' => false, 'message' => 'Nenhum profissional disponível para este horário.']);
                return;
            }
        }

        // Verificar conflitos de horários com o profissional escolhido
        if (!$this->verificarDisponibilidadeHorario($conn, $data, $hora, $profissional_id, $procedimento_id)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Horário não disponível. Já existe um agendamento conflitante.']);
            return;
        }

        try {
            // Check if usuarios table exists, if not create it with default user
            $stmt = $conn->prepare("SHOW TABLES LIKE 'usuarios'");
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                // Create usuarios table
                $createUsuarios = "
                    CREATE TABLE usuarios (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        nome VARCHAR(120) NOT NULL,
                        email VARCHAR(120) NOT NULL UNIQUE,
                        telefone VARCHAR(20) NOT NULL,
                        senha VARCHAR(255) NOT NULL,
                        role ENUM('admin','recepcao','profissional','cliente') NOT NULL DEFAULT 'cliente',
                        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                ";
                $conn->exec($createUsuarios);

                // Insert default user
                $stmt = $conn->prepare('INSERT INTO usuarios (id, nome, email, telefone, senha, role) VALUES (1, "Cliente Padrão", "cliente@taynarabeauty.com", "11999999999", :senha, "cliente")');
                $senhaHash = password_hash('123456', PASSWORD_DEFAULT);
                $stmt->bindParam(':senha', $senhaHash);
                $stmt->execute();
            } else {
                // Check if user ID 1 exists, if not create it
                $stmt = $conn->prepare('SELECT id FROM usuarios WHERE id = 1 LIMIT 1');
                $stmt->execute();
                if ($stmt->rowCount() === 0) {
                    $stmt = $conn->prepare('INSERT INTO usuarios (id, nome, email, telefone, senha, role) VALUES (1, "Cliente Padrão", "cliente@taynarabeauty.com", "11999999999", :senha, "cliente")');
                    $senhaHash = password_hash('123456', PASSWORD_DEFAULT);
                    $stmt->bindParam(':senha', $senhaHash);
                    $stmt->execute();
                }
            }

            // Check if agendamentos table exists, if not create it
            $stmt = $conn->prepare("SHOW TABLES LIKE 'agendamentos'");
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                // Create basic table structure without foreign keys for simplicity
                $createTable = "
                    CREATE TABLE agendamentos (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        usuario_id INT UNSIGNED NOT NULL DEFAULT 1,
                        procedimento_id INT UNSIGNED NOT NULL,
                        opcao_cilios VARCHAR(100) NULL,
                        cor_cilios VARCHAR(50) NULL,
                        opcao_labios VARCHAR(50) NULL,
                        data DATE NOT NULL,
                        hora TIME NOT NULL,
                        observacoes TEXT NULL,
                        status ENUM('pendente','confirmado','cancelado','rejeitado','faltou') NOT NULL DEFAULT 'pendente',
                        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                ";
                $conn->exec($createTable);
            } else {
                // Update existing table to include new status values
                try {
                    $stmt = $conn->prepare("ALTER TABLE agendamentos MODIFY COLUMN status ENUM('pendente','confirmado','cancelado','rejeitado','faltou') NOT NULL DEFAULT 'pendente'");
                    $stmt->execute();
                } catch (Throwable $e) {
                    // Ignore if already updated or if there's an error
                    error_log('Erro ao atualizar coluna status: ' . $e->getMessage());
                }
            }

            // Ensure user ID 1 exists for the foreign key constraint

            // Double-check user exists before inserting agendamento
            $stmt = $conn->prepare('SELECT id FROM usuarios WHERE id = :user_id LIMIT 1');
            $stmt->bindParam(':user_id', $usuario_id);
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                // If user doesn't exist, create it
                try {
                    $stmt = $conn->prepare('INSERT IGNORE INTO usuarios (id, nome, email, senha, role) VALUES (:id, "Cliente Padrão", "cliente@taynarabeauty.com", :senha, "cliente")');
                    $senhaHash = password_hash('123456', PASSWORD_DEFAULT);
                    $stmt->bindParam(':id', $usuario_id);
                    $stmt->bindParam(':senha', $senhaHash);
                    $stmt->execute();
                } catch (Throwable $t) {
                    // If still fails, use a different approach
                    http_response_code(500);
                    echo json_encode(['success' => false, 'message' => 'Erro: usuário padrão não encontrado. Execute: INSERT INTO usuarios (id, nome, email, senha, role) VALUES (1, "Cliente", "cliente@test.com", "hash", "cliente")']);
                    return;
                }
            }

                   // Obter duração do procedimento
                   $duracao = $this->getDuracaoProcedimento($procedimento_id);

                   $stmt = $conn->prepare('INSERT INTO agendamentos (usuario_id, procedimento_id, profissional_id, opcao_cilios, cor_cilios, opcao_labios, data, hora, duracao, observacoes, status) VALUES (:usuario_id, :procedimento_id, :profissional_id, :opcao_cilios, :cor_cilios, :opcao_labios, :data, :hora, :duracao, :observacoes, :status)');
                   $status = 'pendente';
                   $stmt->bindParam(':usuario_id', $usuario_id);
                   $stmt->bindParam(':procedimento_id', $procedimento_id);
                   $stmt->bindParam(':profissional_id', $profissional_id);
                   $stmt->bindParam(':opcao_cilios', $opcao_cilios);
                   $stmt->bindParam(':cor_cilios', $cor_cilios);
                   $stmt->bindParam(':opcao_labios', $opcao_labios);
                   $stmt->bindParam(':data', $data);
                   $stmt->bindParam(':hora', $hora);
                   $stmt->bindParam(':duracao', $duracao);
                   $stmt->bindParam(':observacoes', $observacoes);
                   $stmt->bindParam(':status', $status);
            $stmt->execute();
            $id = (int)$conn->lastInsertId();

            // Bloquear horários conflitantes baseado na duração do procedimento
            $this->bloquearHorariosPorDuracao($conn, $data, $hora, $profissional_id, $procedimento_id);

            // Get procedure name for WhatsApp message
            $servicoLabel = 'Procedimento';
            try {
                $stmt = $conn->prepare('SELECT nome FROM procedimentos WHERE id = :id LIMIT 1');
                $stmt->bindParam(':id', $procedimento_id);
                $stmt->execute();
                $proc = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($proc) {
                    $servicoLabel = $proc['nome'];
                }
            } catch (Throwable $t) {
                // Ignore if procedimentos table doesn't exist
            }

            // Build WhatsApp confirmation link (simplified)
            $texto = "Olá! Solicitei agendamento de {$servicoLabel} para {$data} às {$hora}.";
            $waText = urlencode($texto);
            $whatsNumber = '';
            $whatsBase = 'https://wa.me/';
            $whatsLink = $whatsBase . ($whatsNumber ? $whatsNumber : '') . ($waText ? ('?text=' . $waText) : '');

            // Email handling (simplified)
            $emailSent = false;

            // Enviar notificação para admin/profissionais sobre novo agendamento
            $this->enviarNotificacaoNovoAgendamento($conn, $id, $procedimento_id, $data, $hora);

            echo json_encode([
                'success' => true,
                'message' => 'Agendamento criado com sucesso',
                'id' => $id,
                'whatsapp' => $whatsLink,
                'emailSent' => $emailSent,
            ]);
        } catch (Throwable $e) {
            error_log('Erro AgendamentosController::create: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao criar agendamento: ' . $e->getMessage()]);
        }
    }

    private function getDuracaoProcedimento($procedimento_id) {
        // Mapeamento de duração por procedimento (em minutos)
        $duracoes = [
            1 => 30,  // Design de sobrancelhas
            2 => 45,  // Micropigmentação
            3 => 30,  // Cílios
            4 => 60,  // Lábios
            5 => 120, // Combo (cílios + lábios)
        ];

        return $duracoes[$procedimento_id] ?? 60; // Default 60 minutos
    }

    private function bloquearHorariosPorDuracao($conn, $data, $hora, $profissional_id, $procedimento_id) {
        try {
            // Obter duração do procedimento
            $duracao = $this->getDuracaoProcedimento($procedimento_id);

            // Lógica especial para combo (ID 5)
            if ($procedimento_id == 5) { // Combo
                // Combo deve bloquear horários para cílios (ID 3) e lábios (ID 4) individualmente
                $this->bloquearHorariosCombo($conn, $data, $hora, $profissional_id, $duracao);
                return;
            }

            // Tentar buscar duração das opções do procedimento
            $stmt = $conn->prepare("SHOW TABLES LIKE 'procedimento_opcoes'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $stmt = $conn->prepare('SELECT duracao FROM procedimento_opcoes WHERE procedimento_id = :proc_id AND duracao > 0 LIMIT 1');
                $stmt->bindParam(':proc_id', $procedimento_id);
                $stmt->execute();
                $opcao = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($opcao && $opcao['duracao']) {
                    $duracao = (int)$opcao['duracao'];
                }
            }

            // Converter hora para DateTime
            $dataHora = new DateTime($data . ' ' . $hora);
            $horaInicio = $dataHora->format('H:i:s');

            // Calcular horários que precisam ser bloqueados (intervalos de 15 min)
            $horariosParaBloquear = [];
            $tempoAtual = clone $dataHora;
            $tempoFim = (clone $dataHora)->modify("+{$duracao} minutes");

            while ($tempoAtual < $tempoFim) {
                $horariosParaBloquear[] = $tempoAtual->format('H:i:s');
                $tempoAtual->modify('+15 minutes');
            }

            // Verificar se tabela horarios_disponiveis existe
            $stmt = $conn->prepare("SHOW TABLES LIKE 'horarios_disponiveis'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                // Marcar horários como reservados APENAS para o profissional específico
                foreach ($horariosParaBloquear as $horaBloqueio) {
                    // Primeiro, verificar se o horário existe para este profissional
                    $stmt = $conn->prepare('SELECT id FROM horarios_disponiveis WHERE data = :data AND hora = :hora AND profissional_id = :prof_id');
                    $stmt->bindParam(':data', $data);
                    $stmt->bindParam(':hora', $horaBloqueio);
                    $stmt->bindParam(':prof_id', $profissional_id);
                    $stmt->execute();

                    if ($stmt->rowCount() > 0) {
                        // Se existe, atualizar para reservado
                        $stmt = $conn->prepare('UPDATE horarios_disponiveis SET status = "reservado", procedimento_id = :proc_id WHERE data = :data AND hora = :hora AND profissional_id = :prof_id');
                        $stmt->bindParam(':proc_id', $procedimento_id);
                        $stmt->bindParam(':data', $data);
                        $stmt->bindParam(':hora', $horaBloqueio);
                        $stmt->bindParam(':prof_id', $profissional_id);
                        $stmt->execute();
                    } else {
                        // Se não existe, criar como reservado
                        $stmt = $conn->prepare('INSERT INTO horarios_disponiveis (data, hora, profissional_id, status, procedimento_id) VALUES (:data, :hora, :prof_id, "reservado", :proc_id)');
                        $stmt->bindParam(':data', $data);
                        $stmt->bindParam(':hora', $horaBloqueio);
                        $stmt->bindParam(':prof_id', $profissional_id);
                        $stmt->bindParam(':proc_id', $procedimento_id);
                        $stmt->execute();
                    }
                }
            }

        } catch (Throwable $e) {
            error_log('Erro ao bloquear horários por duração: ' . $e->getMessage());
            // Não interromper o fluxo se falhar o bloqueio
        }
    }

    public function aprovar($id) {
        header('Content-Type: application/json');

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            $stmt = $conn->prepare('UPDATE agendamentos SET status = "confirmado" WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Agendamento aprovado com sucesso'
            ]);
        } catch (Throwable $e) {
            error_log('Erro AgendamentosController::aprovar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao aprovar agendamento: ' . $e->getMessage()]);
        }
    }

    public function rejeitar($id) {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $motivoRejeicao = trim($input['motivo_rejeicao'] ?? '');

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            // Verificar se a coluna motivo_rejeicao existe, se não, adicionar
            $stmt = $conn->prepare("SHOW COLUMNS FROM agendamentos LIKE 'motivo_rejeicao'");
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                $stmt = $conn->prepare("ALTER TABLE agendamentos ADD COLUMN motivo_rejeicao TEXT NULL AFTER observacoes");
                $stmt->execute();
            }

            // Ao rejeitar, também devemos liberar os horários bloqueados
            $stmt = $conn->prepare('SELECT profissional_id, data, hora, procedimento_id FROM agendamentos WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $agendamento = $stmt->fetch(PDO::FETCH_ASSOC);

            // Atualizar status para rejeitado com motivo
            $stmt = $conn->prepare('UPDATE agendamentos SET status = "rejeitado", motivo_rejeicao = :motivo WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':motivo', $motivoRejeicao);
            $stmt->execute();

            // Liberar horários baseado na duração do procedimento
            if ($agendamento) {
                $this->liberarHorariosPorDuracao($conn, $agendamento['data'], $agendamento['hora'], $agendamento['profissional_id'], $agendamento['procedimento_id']);
            }

            echo json_encode([
                'success' => true,
                'message' => 'Agendamento rejeitado com sucesso'
            ]);
        } catch (Throwable $e) {
            error_log('Erro AgendamentosController::rejeitar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao rejeitar agendamento: ' . $e->getMessage()]);
        }
    }

    public function marcarFalta($id) {
        header('Content-Type: application/json');

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            // Ao marcar falta, também devemos liberar os horários bloqueados
            $stmt = $conn->prepare('SELECT profissional_id, data, hora, procedimento_id FROM agendamentos WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $agendamento = $stmt->fetch(PDO::FETCH_ASSOC);

            // Atualizar status para faltou
            $stmt = $conn->prepare('UPDATE agendamentos SET status = "faltou" WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // Liberar horários baseado na duração do procedimento
            if ($agendamento) {
                $this->liberarHorariosPorDuracao($conn, $agendamento['data'], $agendamento['hora'], $agendamento['profissional_id'], $agendamento['procedimento_id']);
            }

            echo json_encode([
                'success' => true,
                'message' => 'Falta registrada com sucesso'
            ]);
        } catch (Throwable $e) {
            error_log('Erro AgendamentosController::marcarFalta: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao marcar falta: ' . $e->getMessage()]);
        }
    }

    public function cancelar($id) {
        header('Content-Type: application/json');

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            // Ao cancelar, também devemos liberar os horários bloqueados
            $stmt = $conn->prepare('SELECT profissional_id, data, hora, procedimento_id FROM agendamentos WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $agendamento = $stmt->fetch(PDO::FETCH_ASSOC);

            // Atualizar status para cancelado
            $stmt = $conn->prepare('UPDATE agendamentos SET status = "cancelado" WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // Liberar horários baseado na duração do procedimento
            if ($agendamento) {
                $this->liberarHorariosPorDuracao($conn, $agendamento['data'], $agendamento['hora'], $agendamento['profissional_id'], $agendamento['procedimento_id']);
            }

            echo json_encode([
                'success' => true,
                'message' => 'Agendamento cancelado com sucesso'
            ]);
        } catch (Throwable $e) {
            error_log('Erro AgendamentosController::cancelar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao cancelar agendamento: ' . $e->getMessage()]);
        }
    }

    private function liberarHorariosPorDuracao($conn, $data, $hora, $profissional_id, $procedimento_id) {
        try {
            // Obter duração do procedimento
            $duracao = 60; // Default 60 minutos se não encontrar

            // Tentar buscar duração das opções do procedimento
            $stmt = $conn->prepare("SHOW TABLES LIKE 'procedimento_opcoes'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $stmt = $conn->prepare('SELECT duracao FROM procedimento_opcoes WHERE procedimento_id = :proc_id AND duracao > 0 LIMIT 1');
                $stmt->bindParam(':proc_id', $procedimento_id);
                $stmt->execute();
                $opcao = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($opcao && $opcao['duracao']) {
                    $duracao = (int)$opcao['duracao'];
                }
            }

            // Converter hora para DateTime
            $dataHora = new DateTime($data . ' ' . $hora);
            $horaInicio = $dataHora->format('H:i:s');

            // Calcular horários que precisam ser liberados (intervalos de 15 min)
            $horariosParaLiberar = [];
            $tempoAtual = clone $dataHora;
            $tempoFim = (clone $dataHora)->modify("+{$duracao} minutes");

            while ($tempoAtual < $tempoFim) {
                $horariosParaLiberar[] = $tempoAtual->format('H:i:s');
                $tempoAtual->modify('+15 minutes');
            }

            // Verificar se tabela horarios_disponiveis existe
            $stmt = $conn->prepare("SHOW TABLES LIKE 'horarios_disponiveis'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                // Liberar horários reservados para este profissional e procedimento
                foreach ($horariosParaLiberar as $horaLiberacao) {
                    $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE data = :data AND hora = :hora AND profissional_id = :prof_id AND status = "reservado"');
                    $stmt->bindParam(':data', $data);
                    $stmt->bindParam(':hora', $horaLiberacao);
                    $stmt->bindParam(':prof_id', $profissional_id);
                    $stmt->execute();
                }
            }

        } catch (Throwable $e) {
            error_log('Erro ao liberar horários por duração: ' . $e->getMessage());
            // Não interromper o fluxo se falhar a liberação
        }
    }

    private function bloquearHorariosCombo($conn, $data, $hora, $profissional_id, $duracaoCombo) {
        try {
            // Combo bloqueia horários para cílios (ID 3) e lábios (ID 4) individualmente
            $procedimentosCombo = [3, 4]; // Cílios e Lábios

            foreach ($procedimentosCombo as $procedimentoId) {
                $duracao = $this->getDuracaoProcedimento($procedimentoId);

                // Converter hora para DateTime
                $dataHora = new DateTime("{$data} {$hora}");
                $horaInicio = $dataHora->format('H:i:s');

                // Calcular horários que precisam ser bloqueados (intervalos de 15 min)
                $horariosParaBloquear = [];
                $tempoAtual = clone $dataHora;
                $tempoFim = (clone $dataHora)->modify("+{$duracao} minutes");

                while ($tempoAtual < $tempoFim) {
                    $horariosParaBloquear[] = $tempoAtual->format('H:i:s');
                    $tempoAtual->modify('+15 minutes');
                }

                // Verificar se tabela horarios_disponiveis existe
                $stmt = $conn->prepare("SHOW TABLES LIKE 'horarios_disponiveis'");
                $stmt->execute();
                if ($stmt->rowCount() > 0) {
                    // Bloquear horários para este procedimento específico
                    foreach ($horariosParaBloquear as $horaBloqueio) {
                        $stmt = $conn->prepare('
                            INSERT INTO horarios_disponiveis (data, hora, profissional_id, status, procedimento_id)
                            VALUES (:data, :hora, :profissional_id, "bloqueado", :procedimento_id)
                            ON DUPLICATE KEY UPDATE status = "bloqueado"
                        ');
                        $stmt->bindParam(':data', $data);
                        $stmt->bindParam(':hora', $horaBloqueio);
                        $stmt->bindParam(':profissional_id', $profissional_id);
                        $stmt->bindParam(':procedimento_id', $procedimentoId);
                        $stmt->execute();
                    }
                }
            }

            error_log("Combo bloqueou horários para cílios e lábios: {$data} {$hora} (duração: {$duracaoCombo}min)");

        } catch (Throwable $e) {
            error_log('Erro ao bloquear horários do combo: ' . $e->getMessage());
        }
    }

    private function verificarDisponibilidadeHorario($conn, $data, $hora, $profissional_id, $procedimento_id) {
        try {
            // Obter duração do procedimento
            $duracao = $this->getDuracaoProcedimento($procedimento_id);

            // Converter hora para minutos
            $horaInicioMinutos = $this->converterHorarioParaMinutos($hora);
            $horaFimMinutos = $horaInicioMinutos + $duracao;

            // Buscar agendamentos existentes que podem conflitar
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
            $stmt->bindParam(':profissional_id', $profissional_id);
            $stmt->bindValue(':hora_fim_minutos', $horaFimMinutos);
            $stmt->bindValue(':hora_inicio_minutos', $horaInicioMinutos);
            $stmt->execute();
            $agendamentosConflitantes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Se encontrou agendamentos conflitantes, o horário não está disponível
            if (count($agendamentosConflitantes) > 0) {
                error_log("Conflito detectado para {$data} {$hora} - Profissional: {$profissional_id} - Procedimento: {$procedimento_id}");
                foreach ($agendamentosConflitantes as $conflito) {
                    error_log("  - Conflita com: {$conflito['procedimento_nome']} às {$conflito['hora']} (duração: {$conflito['duracao']}min)");
                }
                return false;
            }

            return true;

        } catch (Throwable $e) {
            error_log('Erro ao verificar disponibilidade de horário: ' . $e->getMessage());
            return false; // Em caso de erro, não permitir agendamento
        }
    }

    private function converterHorarioParaMinutos($hora) {
        $partes = explode(':', $hora);
        return ($partes[0] * 60) + $partes[1];
    }

    private function escolherProfissionalPorFila($conn, $data, $hora, $procedimento_id) {
        try {
            // Buscar profissionais que têm competência para o procedimento
            $stmt = $conn->prepare('
                SELECT DISTINCT p.id, p.nome
                FROM profissionais p
                INNER JOIN profissional_especializacoes pe ON p.id = pe.profissional_id
                WHERE pe.procedimento_id = :procedimento_id
                AND p.ativo = 1
                ORDER BY p.nome
            ');
            $stmt->bindParam(':procedimento_id', $procedimento_id);
            $stmt->execute();
            $profissionaisCompetentes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($profissionaisCompetentes)) {
                return null; // Nenhum profissional competente
            }

            // Verificar disponibilidade de cada profissional
            $profissionaisDisponiveis = [];
            foreach ($profissionaisCompetentes as $profissional) {
                if ($this->verificarDisponibilidadeHorario($conn, $data, $hora, $profissional['id'], $procedimento_id)) {
                    $profissionaisDisponiveis[] = $profissional;
                }
            }

            if (empty($profissionaisDisponiveis)) {
                return null; // Nenhum profissional disponível
            }

            // Se só há um profissional disponível, escolher ele
            if (count($profissionaisDisponiveis) === 1) {
                return $profissionaisDisponiveis[0]['id'];
            }

            // Sistema de fila: priorizar quem teve o último agendamento há mais tempo
            $profissionaisComUltimoAgendamento = [];
            foreach ($profissionaisDisponiveis as $profissional) {
                $ultimoAgendamento = $this->getUltimoAgendamento($conn, $profissional['id']);
                $profissionaisComUltimoAgendamento[] = [
                    'id' => $profissional['id'],
                    'nome' => $profissional['nome'],
                    'ultimo_agendamento' => $ultimoAgendamento
                ];
            }

            // Ordenar por último agendamento (mais antigo primeiro)
            usort($profissionaisComUltimoAgendamento, function($a, $b) {
                if ($a['ultimo_agendamento'] === null && $b['ultimo_agendamento'] === null) {
                    return 0; // Ambos nunca tiveram agendamento
                }
                if ($a['ultimo_agendamento'] === null) {
                    return -1; // A nunca teve agendamento, priorizar
                }
                if ($b['ultimo_agendamento'] === null) {
                    return 1; // B nunca teve agendamento, priorizar
                }
                return strtotime($a['ultimo_agendamento']) - strtotime($b['ultimo_agendamento']);
            });

            // Se há empate (mesmo tempo de último agendamento), escolher aleatoriamente
            $primeiroProfissional = $profissionaisComUltimoAgendamento[0];
            $profissionaisEmpatados = [$primeiroProfissional];

            for ($i = 1; $i < count($profissionaisComUltimoAgendamento); $i++) {
                $profissional = $profissionaisComUltimoAgendamento[$i];
                if ($this->temMesmoUltimoAgendamento($primeiroProfissional['ultimo_agendamento'], $profissional['ultimo_agendamento'])) {
                    $profissionaisEmpatados[] = $profissional;
                } else {
                    break; // Não há mais empates
                }
            }

            // Escolher aleatoriamente entre os empatados
            $escolhido = $profissionaisEmpatados[array_rand($profissionaisEmpatados)];

            error_log("Sistema de fila escolheu profissional ID {$escolhido['id']} ({$escolhido['nome']}) para {$data} {$hora}");

            return $escolhido['id'];

        } catch (Throwable $e) {
            error_log('Erro ao escolher profissional por fila: ' . $e->getMessage());
            return null;
        }
    }

    private function getUltimoAgendamento($conn, $profissional_id) {
        try {
            $stmt = $conn->prepare('
                SELECT MAX(CONCAT(data, " ", hora)) as ultimo_agendamento
                FROM agendamentos
                WHERE profissional_id = :profissional_id
                AND status IN ("pendente", "confirmado")
            ');
            $stmt->bindParam(':profissional_id', $profissional_id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            return $result ? $result['ultimo_agendamento'] : null;
        } catch (Throwable $e) {
            error_log('Erro ao buscar último agendamento: ' . $e->getMessage());
            return null;
        }
    }

    private function temMesmoUltimoAgendamento($ultimo1, $ultimo2) {
        if ($ultimo1 === null && $ultimo2 === null) {
            return true;
        }
        if ($ultimo1 === null || $ultimo2 === null) {
            return false;
        }
        return strtotime($ultimo1) === strtotime($ultimo2);
    }

    private function enviarNotificacaoNovoAgendamento($conn, $agendamentoId, $procedimentoId, $data, $hora) {
        try {
            // Buscar nome do procedimento
            $stmt = $conn->prepare('SELECT nome FROM procedimentos WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $procedimentoId);
            $stmt->execute();
            $procedimento = $stmt->fetch(PDO::FETCH_ASSOC);
            $procedimentoNome = $procedimento ? $procedimento['nome'] : 'Procedimento';

            // Buscar usuários admin e recepção para notificar
            $stmt = $conn->prepare('SELECT id, role FROM usuarios WHERE role IN ("admin", "recepcao")');
            $stmt->execute();
            $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($usuarios as $usuario) {
                $notificacao = [
                    'usuario_id' => $usuario['id'],
                    'titulo' => 'Novo Agendamento',
                    'mensagem' => "Novo agendamento de {$procedimentoNome} para {$data} às {$hora}",
                    'tipo' => 'info',
                    'action_url' => $usuario['role'] === 'admin' ? '/agendamentos-admin' : '/meus-agendamentos',
                    'action_text' => 'Ver Agendamentos',
                    'criado_em' => date('Y-m-d H:i:s')
                ];

                // Inserir notificação (assumindo que existe uma tabela notificacoes)
                $stmt = $conn->prepare('
                    INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, action_url, action_text, criado_em)
                    VALUES (:usuario_id, :titulo, :mensagem, :tipo, :action_url, :action_text, :criado_em)
                ');
                $stmt->bindParam(':usuario_id', $notificacao['usuario_id']);
                $stmt->bindParam(':titulo', $notificacao['titulo']);
                $stmt->bindParam(':mensagem', $notificacao['mensagem']);
                $stmt->bindParam(':tipo', $notificacao['tipo']);
                $stmt->bindParam(':action_url', $notificacao['action_url']);
                $stmt->bindParam(':action_text', $notificacao['action_text']);
                $stmt->bindParam(':criado_em', $notificacao['criado_em']);
                $stmt->execute();
            }
        } catch (Throwable $e) {
            error_log('Erro ao enviar notificação de novo agendamento: ' . $e->getMessage());
            // Não interromper o fluxo se falhar o envio da notificação
        }
    }

    public function desmarcar($id) {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $justificativa = trim($input['justificativa'] ?? '');

        if (empty($justificativa)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Justificativa é obrigatória']);
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
            // Verificar se a coluna justificativa_desmarcacao existe, se não, adicionar
            $stmt = $conn->prepare("SHOW COLUMNS FROM agendamentos LIKE 'justificativa_desmarcacao'");
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                $stmt = $conn->prepare("ALTER TABLE agendamentos ADD COLUMN justificativa_desmarcacao TEXT NULL AFTER motivo_rejeicao");
                $stmt->execute();
            }

            // Buscar dados do agendamento para liberar horários
            $stmt = $conn->prepare('SELECT profissional_id, data, hora FROM agendamentos WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $agendamento = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$agendamento) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Agendamento não encontrado']);
                return;
            }

            // Atualizar status para cancelado com justificativa
            $stmt = $conn->prepare('UPDATE agendamentos SET status = "cancelado", justificativa_desmarcacao = :justificativa WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':justificativa', $justificativa);
            $stmt->execute();

            // Liberar horários baseado na duração do procedimento
            $this->liberarHorariosPorDuracao($conn, $agendamento['data'], $agendamento['hora'], $agendamento['profissional_id'], $agendamento['procedimento_id']);

            echo json_encode([
                'success' => true,
                'message' => 'Agendamento desmarcado com sucesso'
            ]);
        } catch (Throwable $e) {
            error_log('Erro AgendamentosController::desmarcar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao desmarcar agendamento: ' . $e->getMessage()]);
        }
    }

    public function updateStatus($id) {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $status = trim($input['status'] ?? '');
        $mensagem = trim($input['mensagem'] ?? '');

        if (!in_array($status, ['pendente', 'confirmado', 'rejeitado', 'cancelado', 'faltou', 'expirado'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Status inválido']);
            return;
        }

        try {
            $db = new Database();
            $conn = $db->connect();

            // Verificar se o agendamento existe
            $stmt = $conn->prepare("SELECT id FROM agendamentos WHERE id = ?");
            $stmt->execute([$id]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Agendamento não encontrado']);
                return;
            }

            // Atualizar status e mensagem
            $sql = "UPDATE agendamentos SET status = ?";
            $params = [$status];

            if ($mensagem !== '') {
                if ($status === 'rejeitado') {
                    $sql .= ", motivo_rejeicao = ?";
                } else if ($status === 'confirmado') {
                    $sql .= ", mensagem_aprovacao = ?";
                }
                $params[] = $mensagem;
            }

            $sql .= " WHERE id = ?";
            $params[] = $id;

            $stmt = $conn->prepare($sql);
            $result = $stmt->execute($params);

            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Status atualizado com sucesso'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Erro ao atualizar status']);
            }

        } catch (Throwable $e) {
            error_log('Erro AgendamentosController::updateStatus: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao atualizar status: ' . $e->getMessage()]);
        }
    }

    public function atualizarExpirados() {
        try {
            $db = new Database();
            $conn = $db->connect();

            // Buscar agendamentos pendentes que passaram da data
            $hoje = date('Y-m-d');
            error_log("Buscando agendamentos expirados para data: $hoje");

            $stmt = $conn->prepare("
                SELECT id FROM agendamentos
                WHERE status = 'pendente'
                AND data < ?
            ");
            $stmt->execute([$hoje]);
            $agendamentosExpirados = $stmt->fetchAll(PDO::FETCH_COLUMN);

            error_log("Agendamentos expirados encontrados: " . json_encode($agendamentosExpirados));

            if (empty($agendamentosExpirados)) {
                error_log("Nenhum agendamento expirado encontrado");
                return ['success' => true, 'message' => 'Nenhum agendamento expirado encontrado', 'count' => 0];
            }

            // Atualizar para expirado
            $placeholders = str_repeat('?,', count($agendamentosExpirados) - 1) . '?';
            $stmt = $conn->prepare("
                UPDATE agendamentos
                SET status = 'expirado'
                WHERE id IN ($placeholders)
            ");
            $result = $stmt->execute($agendamentosExpirados);

            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Agendamentos expirados atualizados com sucesso',
                    'count' => count($agendamentosExpirados)
                ];
            } else {
                return ['success' => false, 'message' => 'Erro ao atualizar agendamentos expirados'];
            }

        } catch (Throwable $e) {
            error_log('Erro AgendamentosController::atualizarExpirados: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Erro ao atualizar agendamentos expirados: ' . $e->getMessage()];
        }
    }
}


