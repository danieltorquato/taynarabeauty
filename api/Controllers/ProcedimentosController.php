<?php
class ProcedimentosController {
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
            $procedimentos = [];
            $opcoesPorProcedimento = [];

            // Check if procedimentos table exists
            $stmt = $conn->prepare("SHOW TABLES LIKE 'procedimentos'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                // Buscar procedimentos ativos
                $stmt = $conn->prepare('SELECT id, nome, categoria, duracao_min, preco_centavos FROM procedimentos WHERE ativo = 1');
                $stmt->execute();
                $procedimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Check if procedimento_opcoes table exists
                $stmt = $conn->prepare("SHOW TABLES LIKE 'procedimento_opcoes'");
                $stmt->execute();
                if ($stmt->rowCount() > 0) {
                    // Buscar opções para cada procedimento
                    $stmt = $conn->prepare('SELECT procedimento_id, tipo, label, value FROM procedimento_opcoes WHERE ativo = 1 ORDER BY tipo, id');
                    $stmt->execute();
                    $opcoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    // Organizar opções por procedimento
                    foreach ($opcoes as $opcao) {
                        $procId = $opcao['procedimento_id'];
                        if (!isset($opcoesPorProcedimento[$procId])) {
                            $opcoesPorProcedimento[$procId] = [];
                        }
                        $opcoesPorProcedimento[$procId][] = $opcao;
                    }
                }
            } else {
                // Create demo data based on your price table
                $procedimentos = [
                    ['id' => 1, 'nome' => 'Fio a Fio - Rímel', 'categoria' => 'cilios', 'duracao_min' => 120, 'preco_centavos' => 15000],
                    ['id' => 2, 'nome' => 'Volume Brasileiro', 'categoria' => 'cilios', 'duracao_min' => 150, 'preco_centavos' => 16000],
                    ['id' => 3, 'nome' => 'Volume Brasileiro Marrom', 'categoria' => 'cilios', 'duracao_min' => 150, 'preco_centavos' => 17000],
                    ['id' => 4, 'nome' => 'Volume Inglês', 'categoria' => 'cilios', 'duracao_min' => 180, 'preco_centavos' => 18000],
                    ['id' => 5, 'nome' => 'Fox Eyes - Raposinha', 'categoria' => 'cilios', 'duracao_min' => 180, 'preco_centavos' => 18000],
                    ['id' => 6, 'nome' => 'Lash Lifting', 'categoria' => 'cilios', 'duracao_min' => 120, 'preco_centavos' => 15000],
                    ['id' => 7, 'nome' => 'Hidragloss - Lips', 'categoria' => 'labios', 'duracao_min' => 60, 'preco_centavos' => 13000],
                    ['id' => 8, 'nome' => 'Combo Completo', 'categoria' => 'combo', 'duracao_min' => 240, 'preco_centavos' => 28000]
                ];
                $opcoesPorProcedimento = [
                    1 => [
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto'],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom']
                    ],
                    2 => [
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto'],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom']
                    ],
                    3 => [
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom']
                    ],
                    4 => [
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto'],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom']
                    ],
                    5 => [
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto'],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom']
                    ],
                    6 => [], // Lash lifting não precisa cor
                    7 => [
                        ['tipo' => 'labios_cor', 'label' => 'Natural', 'value' => 'natural'],
                        ['tipo' => 'labios_cor', 'label' => 'Rosé', 'value' => 'rose'],
                        ['tipo' => 'labios_cor', 'label' => 'Nude', 'value' => 'nude']
                    ],
                    8 => [
                        ['tipo' => 'cilios_tipo', 'label' => 'Volume Brasileiro', 'value' => 'volume-brasileiro'],
                        ['tipo' => 'cilios_tipo', 'label' => 'Volume Inglês', 'value' => 'volume-ingles'],
                        ['tipo' => 'cilios_tipo', 'label' => 'Fox Eyes', 'value' => 'fox-eyes'],
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto'],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom'],
                        ['tipo' => 'labios_cor', 'label' => 'Natural', 'value' => 'natural'],
                        ['tipo' => 'labios_cor', 'label' => 'Rosé', 'value' => 'rose'],
                        ['tipo' => 'labios_cor', 'label' => 'Nude', 'value' => 'nude']
                    ]
                ];
            }

            echo json_encode([
                'success' => true,
                'procedimentos' => $procedimentos,
                'opcoes' => $opcoesPorProcedimento
            ]);
        } catch (Throwable $e) {
            error_log('Erro ProcedimentosController::listar: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar procedimentos: ' . $e->getMessage()]);
        }
    }
}
