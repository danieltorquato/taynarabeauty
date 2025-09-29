<?php
class AgendamentosController {
    public function create() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

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

        // Se profissional_id = 0, significa "sem preferência" - usar o primeiro disponível
        if ($profissional_id === 0) {
            $profissional_id = 1; // Default para primeiro profissional
        }

        $db = new Database();
        $conn = $db->connect();
        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
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
                        senha VARCHAR(255) NOT NULL,
                        role ENUM('admin','recepcao','profissional','cliente') NOT NULL DEFAULT 'cliente',
                        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                ";
                $conn->exec($createUsuarios);

                // Insert default user
                $stmt = $conn->prepare('INSERT INTO usuarios (id, nome, email, senha, role) VALUES (1, "Cliente Padrão", "cliente@taynarabeauty.com", :senha, "cliente")');
                $senhaHash = password_hash('123456', PASSWORD_DEFAULT);
                $stmt->bindParam(':senha', $senhaHash);
                $stmt->execute();
            } else {
                // Check if user ID 1 exists, if not create it
                $stmt = $conn->prepare('SELECT id FROM usuarios WHERE id = 1 LIMIT 1');
                $stmt->execute();
                if ($stmt->rowCount() === 0) {
                    $stmt = $conn->prepare('INSERT INTO usuarios (id, nome, email, senha, role) VALUES (1, "Cliente Padrão", "cliente@taynarabeauty.com", :senha, "cliente")');
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
                        status ENUM('pendente','confirmado','cancelado') NOT NULL DEFAULT 'pendente',
                        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                ";
                $conn->exec($createTable);
            }

            // Ensure user ID 1 exists for the foreign key constraint
            $usuario_id = 1; // TODO: get from JWT token

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

                   $stmt = $conn->prepare('INSERT INTO agendamentos (usuario_id, procedimento_id, profissional_id, opcao_cilios, cor_cilios, opcao_labios, data, hora, observacoes, status) VALUES (:usuario_id, :procedimento_id, :profissional_id, :opcao_cilios, :cor_cilios, :opcao_labios, :data, :hora, :observacoes, :status)');
                   $status = 'pendente';
                   $stmt->bindParam(':usuario_id', $usuario_id);
                   $stmt->bindParam(':procedimento_id', $procedimento_id);
                   $stmt->bindParam(':profissional_id', $profissional_id);
                   $stmt->bindParam(':opcao_cilios', $opcao_cilios);
                   $stmt->bindParam(':cor_cilios', $cor_cilios);
                   $stmt->bindParam(':opcao_labios', $opcao_labios);
                   $stmt->bindParam(':data', $data);
                   $stmt->bindParam(':hora', $hora);
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

    private function bloquearHorariosPorDuracao($conn, $data, $hora, $profissional_id, $procedimento_id) {
        try {
            // Buscar duração do procedimento (das opções selecionadas)
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

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            // Ao rejeitar, também devemos liberar os horários bloqueados
            $stmt = $conn->prepare('SELECT profissional_id, data, hora FROM agendamentos WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $agendamento = $stmt->fetch(PDO::FETCH_ASSOC);

            // Atualizar status para rejeitado
            $stmt = $conn->prepare('UPDATE agendamentos SET status = "rejeitado" WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // Liberar horários
            if ($agendamento) {
                $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE profissional_id = :prof_id AND data = :data AND hora = :hora AND status = "reservado"');
                $stmt->bindParam(':prof_id', $agendamento['profissional_id']);
                $stmt->bindParam(':data', $agendamento['data']);
                $stmt->bindParam(':hora', $agendamento['hora']);
                $stmt->execute();
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
            $stmt = $conn->prepare('SELECT profissional_id, data, hora FROM agendamentos WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $agendamento = $stmt->fetch(PDO::FETCH_ASSOC);

            // Atualizar status para faltou
            $stmt = $conn->prepare('UPDATE agendamentos SET status = "faltou" WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // Liberar horários
            if ($agendamento) {
                $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE profissional_id = :prof_id AND data = :data AND hora = :hora AND status = "reservado"');
                $stmt->bindParam(':prof_id', $agendamento['profissional_id']);
                $stmt->bindParam(':data', $agendamento['data']);
                $stmt->bindParam(':hora', $agendamento['hora']);
                $stmt->execute();
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
            $stmt = $conn->prepare('SELECT profissional_id, data, hora FROM agendamentos WHERE id = :id LIMIT 1');
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $agendamento = $stmt->fetch(PDO::FETCH_ASSOC);

            // Atualizar status para cancelado
            $stmt = $conn->prepare('UPDATE agendamentos SET status = "cancelado" WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // Liberar horários
            if ($agendamento) {
                $stmt = $conn->prepare('DELETE FROM horarios_disponiveis WHERE profissional_id = :prof_id AND data = :data AND hora = :hora AND status = "reservado"');
                $stmt->bindParam(':prof_id', $agendamento['profissional_id']);
                $stmt->bindParam(':data', $agendamento['data']);
                $stmt->bindParam(':hora', $agendamento['hora']);
                $stmt->execute();
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
}


