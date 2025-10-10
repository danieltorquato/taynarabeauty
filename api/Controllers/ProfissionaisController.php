<?php
require_once __DIR__ . '/../Config/Timezone.php';
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
                    // Se não há procedimentoId, retornar todos os profissionais ativos
                    $profissionais = $this->getTodosProfissionais($conn);
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
            // Lógica especial para combo (ID 5) - profissionais que têm AMBAS as competências
            if ($procedimentoId == 5) { // Combo
                $stmt = $conn->prepare('
                    SELECT DISTINCT p.id, p.nome, p.usuario_id, u.nome as usuario_nome
                    FROM profissionais p
                    LEFT JOIN usuarios u ON p.usuario_id = u.id
                    WHERE p.ativo = 1
                    AND p.id IN (
                        SELECT pe1.profissional_id
                        FROM profissional_especializacoes pe1
                        INNER JOIN profissional_especializacoes pe2 ON pe1.profissional_id = pe2.profissional_id
                        WHERE pe1.procedimento_id = 3 AND pe2.procedimento_id = 4
                    )
                    ORDER BY p.nome
                ');
                $stmt->execute();
                $profissionais = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                // Para outros procedimentos, buscar normalmente
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
            }
        } else {
            // Fallback para lógica hardcoded se tabela não existir
            $profissionais = $this->getProfissionaisHardcoded($conn, $procedimentoId);
        }

        // Adicionar competências para cada profissional
        foreach ($profissionais as &$profissional) {
            $profissional['competencias'] = $this->getCompetenciasProfissional($conn, $profissional['id']);
        }

        return $profissionais;
    }

    private function getTodosProfissionais($conn) {
        // Buscar todos os profissionais ativos
        $stmt = $conn->prepare('
            SELECT p.id, p.nome, p.usuario_id, u.nome as usuario_nome, p.almoco_inicio, p.almoco_fim, p.ativo
            FROM profissionais p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.nome
        ');
        $stmt->execute();
        $profissionais = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Se não há profissionais na tabela, retornar dados demo
        if (empty($profissionais)) {
            return $this->getProfissionaisDemo(null);
        }

        // Adicionar competências para cada profissional
        foreach ($profissionais as &$profissional) {
            $profissional['competencias'] = $this->getCompetenciasProfissional($conn, $profissional['id']);
        }

        return $profissionais;
    }

    private function getCompetenciasProfissional($conn, $profissionalId) {
        $competencias = [];

        // Verificar se tabela de especializações existe
        $stmt = $conn->prepare("SHOW TABLES LIKE 'profissional_especializacoes'");
        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            // Buscar competências do profissional
            $stmt = $conn->prepare('
                SELECT pe.procedimento_id
                FROM profissional_especializacoes pe
                WHERE pe.profissional_id = :profissional_id
            ');
            $stmt->bindParam(':profissional_id', $profissionalId);
            $stmt->execute();
            $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($resultados as $resultado) {
                $competencias[] = (int)$resultado['procedimento_id'];
            }
        }

        return $competencias;
    }

    private function getProfissionaisHardcoded($conn, $procedimentoId) {
        // Lógica de especialização hardcoded como fallback
        $profissionais = [];

        // Se não há procedimentoId, retornar lista vazia (não mostrar ninguém)
        if (!$procedimentoId) {
            return $profissionais;
        }

        // Lógica especial para combo (ID 5) - profissionais que podem fazer cílios E lábios
        if ($procedimentoId == 5) { // Combo
            // Buscar profissionais que têm AMBAS as competências (cílios E lábios)
            // Taynara pode fazer cílios, mas não lábios - NÃO aparece no combo
            // Mayara pode fazer lábios, mas não cílios - NÃO aparece no combo
            // Sara pode fazer lábios, mas não cílios - NÃO aparece no combo

            // Por enquanto, nenhum profissional hardcoded pode fazer combo
            // Isso será resolvido quando os profissionais forem configurados com competências individuais
            return $profissionais;
        }

        // Taynara (ID 1) - Especialista em cílios (procedimento_id 1, 2, 3, 6)
        if (in_array($procedimentoId, [1, 2, 3, 6])) {
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

        // Sara (ID 3) - Especialista em lábios (procedimento_id 4)
        if (in_array($procedimentoId, [4])) {
            $stmt = $conn->prepare('SELECT p.id, p.nome, p.usuario_id, u.nome as usuario_nome FROM profissionais p LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = 3 AND p.ativo = 1');
            $stmt->execute();
            $sara = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($sara) {
                $profissionais[] = $sara;
            }
        }

        return $profissionais;
    }

    private function getProfissionaisDemo($procedimentoId) {
        $profissionais = [];

        // Se não há procedimentoId, retornar todos os profissionais demo
        if (!$procedimentoId) {
            return [
                ['id' => 1, 'nome' => 'Taynara Casagrande', 'usuario_id' => 3, 'usuario_nome' => 'Taynara', 'competencias' => [1, 2, 3, 6], 'almoco_inicio' => '12:00:00', 'almoco_fim' => '13:00:00'],
                ['id' => 2, 'nome' => 'Mayara Casagrande', 'usuario_id' => 4, 'usuario_nome' => 'Mayara', 'competencias' => [4], 'almoco_inicio' => '12:00:00', 'almoco_fim' => '13:00:00'],
                ['id' => 3, 'nome' => 'Sara Casagrande', 'usuario_id' => 5, 'usuario_nome' => 'Sara', 'competencias' => [4], 'almoco_inicio' => '12:00:00', 'almoco_fim' => '13:00:00']
            ];
        }

        // Lógica especial para combo (ID 5) - profissionais que podem fazer cílios E lábios
        if ($procedimentoId == 5) { // Combo
            // Nenhum profissional demo pode fazer combo (ninguém tem ambas as competências)
            // Taynara: cílios apenas
            // Mayara: lábios apenas
            // Sara: lábios apenas
            return $profissionais;
        }

        // Taynara (ID 1) - Especialista em cílios (procedimento_id 1, 2, 3, 6)
        if (in_array($procedimentoId, [1, 2, 3, 6])) {
            $profissionais[] = ['id' => 1, 'nome' => 'Taynara Casagrande', 'usuario_id' => 3, 'usuario_nome' => 'Taynara'];
        }

        // Mayara (ID 2) - Especialista em lábios (procedimento_id 4)
        if (in_array($procedimentoId, [4])) {
            $profissionais[] = ['id' => 2, 'nome' => 'Mayara Casagrande', 'usuario_id' => 4, 'usuario_nome' => 'Mayara'];
        }

        // Sara (ID 3) - Especialista em lábios (procedimento_id 4)
        if (in_array($procedimentoId, [4])) {
            $profissionais[] = ['id' => 3, 'nome' => 'Sara Casagrande', 'usuario_id' => 5, 'usuario_nome' => 'Sara'];
        }

        return $profissionais;
    }

    public function criar() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $nome = trim($input['nome'] ?? '');
        $usuario_id = (int)($input['usuario_id'] ?? 0);
        $ativo = (bool)($input['ativo'] ?? true);
        $competencias = $input['competencias'] ?? [];
        $foto = trim($input['foto'] ?? '');
        $almoco_inicio = trim($input['almoco_inicio'] ?? '12:00:00');
        $almoco_fim = trim($input['almoco_fim'] ?? '13:00:00');

        if ($nome === '' || $usuario_id === 0) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Nome e usuário são obrigatórios']);
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
            $conn->beginTransaction();

            // Inserir profissional
            $stmt = $conn->prepare('INSERT INTO profissionais (nome, usuario_id, ativo, foto, almoco_inicio, almoco_fim) VALUES (:nome, :usuario_id, :ativo, :foto, :almoco_inicio, :almoco_fim)');
            $stmt->bindParam(':nome', $nome);
            $stmt->bindParam(':usuario_id', $usuario_id);
            $stmt->bindParam(':ativo', $ativo, PDO::PARAM_BOOL);
            $stmt->bindParam(':foto', $foto);
            $stmt->bindParam(':almoco_inicio', $almoco_inicio);
            $stmt->bindParam(':almoco_fim', $almoco_fim);
            $stmt->execute();
            $profissional_id = (int)$conn->lastInsertId();

            // Inserir competências
            if (!empty($competencias)) {
                $stmt = $conn->prepare('INSERT INTO profissional_especializacoes (profissional_id, procedimento_id) VALUES (:profissional_id, :procedimento_id)');
                foreach ($competencias as $procedimento_id) {
                    $stmt->bindParam(':profissional_id', $profissional_id);
                    $stmt->bindParam(':procedimento_id', $procedimento_id);
                    $stmt->execute();
                }
            }

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Profissional criado com sucesso',
                'id' => $profissional_id
            ]);
        } catch (Throwable $e) {
            $conn->rollback();
            error_log('Erro ProfissionaisController::criar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao criar profissional: ' . $e->getMessage()]);
        }
    }

    public function atualizar($id) {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $nome = trim($input['nome'] ?? '');
        $usuario_id = (int)($input['usuario_id'] ?? 0);
        $ativo = (bool)($input['ativo'] ?? true);
        $competencias = $input['competencias'] ?? [];
        $foto = trim($input['foto'] ?? '');
        $almoco_inicio = trim($input['almoco_inicio'] ?? '12:00:00');
        $almoco_fim = trim($input['almoco_fim'] ?? '13:00:00');

        if ($nome === '' || $usuario_id === 0) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Nome e usuário são obrigatórios']);
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
            $conn->beginTransaction();

            // Atualizar profissional
            $stmt = $conn->prepare('UPDATE profissionais SET nome = :nome, usuario_id = :usuario_id, ativo = :ativo, foto = :foto, almoco_inicio = :almoco_inicio, almoco_fim = :almoco_fim WHERE id = :id');
            $stmt->bindParam(':nome', $nome);
            $stmt->bindParam(':usuario_id', $usuario_id);
            $stmt->bindParam(':ativo', $ativo, PDO::PARAM_BOOL);
            $stmt->bindParam(':foto', $foto);
            $stmt->bindParam(':almoco_inicio', $almoco_inicio);
            $stmt->bindParam(':almoco_fim', $almoco_fim);
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // Remover competências antigas
            $stmt = $conn->prepare('DELETE FROM profissional_especializacoes WHERE profissional_id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // Inserir novas competências
            if (!empty($competencias)) {
                $stmt = $conn->prepare('INSERT INTO profissional_especializacoes (profissional_id, procedimento_id) VALUES (:profissional_id, :procedimento_id)');
                foreach ($competencias as $procedimento_id) {
                    $stmt->bindParam(':profissional_id', $id);
                    $stmt->bindParam(':procedimento_id', $procedimento_id);
                    $stmt->execute();
                }
            }

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Profissional atualizado com sucesso'
            ]);
        } catch (Throwable $e) {
            $conn->rollback();
            error_log('Erro ProfissionaisController::atualizar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao atualizar profissional: ' . $e->getMessage()]);
        }
    }

    public function excluir($id) {
        header('Content-Type: application/json');

        $db = new Database();
        $conn = $db->connect();

        if ($conn === null) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Falha na conexão com o banco de dados']);
            return;
        }

        try {
            $conn->beginTransaction();

            // Remover especializações
            $stmt = $conn->prepare('DELETE FROM profissional_especializacoes WHERE profissional_id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            // Remover profissional
            $stmt = $conn->prepare('DELETE FROM profissionais WHERE id = :id');
            $stmt->bindParam(':id', $id);
            $stmt->execute();

            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Profissional excluído com sucesso'
            ]);
        } catch (Throwable $e) {
            $conn->rollback();
            error_log('Erro ProfissionaisController::excluir: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao excluir profissional: ' . $e->getMessage()]);
        }
    }
}
?>
