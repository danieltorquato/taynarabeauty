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
                $stmt = $conn->prepare('SELECT id, nome, categoria FROM procedimentos WHERE ativo = 1');
                $stmt->execute();
                $procedimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Check if procedimento_opcoes table exists
                $stmt = $conn->prepare("SHOW TABLES LIKE 'procedimento_opcoes'");
                $stmt->execute();
                if ($stmt->rowCount() > 0) {
                        // Buscar opções para cada procedimento - primeiro verificar quais colunas existem
                        $stmt = $conn->prepare("DESCRIBE procedimento_opcoes");
                        $stmt->execute();
                        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

                        $selectFields = 'procedimento_id, tipo, label, value';
                        if (in_array('preco_centavos', $columns)) {
                            $selectFields .= ', preco_centavos';
                        }
                        if (in_array('duracao', $columns)) {
                            $selectFields .= ', duracao';
                        }

                        $stmt = $conn->prepare("SELECT {$selectFields} FROM procedimento_opcoes WHERE ativo = 1 ORDER BY procedimento_id, tipo, id");
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

                    // Adicionar cores de cílios para o procedimento 3 se não existirem
                    if (isset($opcoesPorProcedimento[3])) {
                        $temCoresCilios = false;
                        foreach ($opcoesPorProcedimento[3] as $opcao) {
                            if ($opcao['tipo'] === 'cilios_cor') {
                                $temCoresCilios = true;
                                break;
                            }
                        }

                        if (!$temCoresCilios) {
                            $opcoesPorProcedimento[3][] = ['procedimento_id' => 3, 'tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto', 'preco_centavos' => 0, 'duracao' => 0];
                            $opcoesPorProcedimento[3][] = ['procedimento_id' => 3, 'tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom', 'preco_centavos' => 500, 'duracao' => 0];
                        }
                    }
                }
            } else {
                // Create demo data based on your price table
                $procedimentos = [
                    ['id' => 1, 'nome' => 'Fio a Fio - Rímel', 'categoria' => 'cilios'],
                    ['id' => 2, 'nome' => 'Volume Brasileiro', 'categoria' => 'cilios'],
                    ['id' => 3, 'nome' => 'Volume Brasileiro Marrom', 'categoria' => 'cilios'],
                    ['id' => 4, 'nome' => 'Volume Inglês', 'categoria' => 'cilios'],
                    ['id' => 5, 'nome' => 'Fox Eyes - Raposinha', 'categoria' => 'cilios'],
                    ['id' => 6, 'nome' => 'Lash Lifting', 'categoria' => 'cilios'],
                    ['id' => 7, 'nome' => 'Hidragloss - Lips', 'categoria' => 'labios'],
                    ['id' => 8, 'nome' => 'Combo Completo', 'categoria' => 'combo']
                ];
                $opcoesPorProcedimento = [
                    1 => [
                        ['tipo' => 'procedimento_principal', 'label' => 'Fio a Fio - Rímel', 'value' => 'fio-rimel', 'preco_centavos' => 15000, 'duracao' => 120],
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto', 'preco_centavos' => 0],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom', 'preco_centavos' => 500]
                    ],
                    2 => [
                        ['tipo' => 'procedimento_principal', 'label' => 'Volume Brasileiro', 'value' => 'volume-brasileiro', 'preco_centavos' => 16000, 'duracao' => 150],
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto'],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom']
                    ],
                    3 => [
                        ['tipo' => 'procedimento_principal', 'label' => 'Volume Brasileiro Marrom', 'value' => 'volume-brasileiro-marrom', 'preco_centavos' => 17000, 'duracao' => 150],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom']
                    ],
                    4 => [
                        ['tipo' => 'procedimento_principal', 'label' => 'Volume Inglês', 'value' => 'volume-ingles', 'preco_centavos' => 18000, 'duracao' => 180],
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto'],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom']
                    ],
                    5 => [
                        ['tipo' => 'procedimento_principal', 'label' => 'Fox Eyes - Raposinha', 'value' => 'fox-eyes', 'preco_centavos' => 18000, 'duracao' => 180],
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto'],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom']
                    ],
                    6 => [
                        ['tipo' => 'procedimento_principal', 'label' => 'Lash Lifting', 'value' => 'lash-lifting', 'preco_centavos' => 15000, 'duracao' => 120]
                    ],
                    7 => [
                        ['tipo' => 'procedimento_principal', 'label' => 'Hidragloss - Lips', 'value' => 'hidragloss', 'preco_centavos' => 13000, 'duracao' => 60],
                        ['tipo' => 'labios_cor', 'label' => 'Natural', 'value' => 'natural', 'hex' => '#F4C2A1'],
                        ['tipo' => 'labios_cor', 'label' => 'Rosé', 'value' => 'rose', 'hex' => '#D93766'],
                        ['tipo' => 'labios_cor', 'label' => 'Nude', 'value' => 'nude', 'hex' => '#E8B0A0']
                    ],
                    8 => [
                        ['tipo' => 'cilios_tipo', 'label' => 'Volume Brasileiro', 'value' => 'volume-brasileiro', 'preco_centavos' => 16000, 'duracao' => 150],
                        ['tipo' => 'cilios_tipo', 'label' => 'Volume Inglês', 'value' => 'volume-ingles', 'preco_centavos' => 18000, 'duracao' => 180],
                        ['tipo' => 'cilios_tipo', 'label' => 'Fox Eyes', 'value' => 'fox-eyes', 'preco_centavos' => 18000, 'duracao' => 180],
                        ['tipo' => 'cilios_cor', 'label' => 'Preto', 'value' => 'preto'],
                        ['tipo' => 'cilios_cor', 'label' => 'Marrom', 'value' => 'marrom'],
                        ['tipo' => 'labios_tipo', 'label' => 'Hidragloss', 'value' => 'hidragloss', 'preco_centavos' => 13000, 'duracao' => 60],
                        ['tipo' => 'labios_cor', 'label' => 'Natural', 'value' => 'natural', 'hex' => '#F4C2A1'],
                        ['tipo' => 'labios_cor', 'label' => 'Rosé', 'value' => 'rose', 'hex' => '#D93766'],
                        ['tipo' => 'labios_cor', 'label' => 'Nude', 'value' => 'nude', 'hex' => '#E8B0A0'],
                        ['tipo' => 'labios_cor', 'label' => 'Peach', 'value' => 'peach', 'hex' => '#FFB4A2'],
                        ['tipo' => 'labios_cor', 'label' => 'Penélope', 'value' => 'penelope', 'hex' => '#D56B86'],
                        ['tipo' => 'labios_cor', 'label' => 'Red Life', 'value' => 'red-life', 'hex' => '#EE4266'],
                        ['tipo' => 'labios_cor', 'label' => 'Red Rose', 'value' => 'red-rose', 'hex' => '#D93766'],
                        ['tipo' => 'labios_cor', 'label' => 'Ruby', 'value' => 'ruby', 'hex' => '#BC3B58'],
                        ['tipo' => 'labios_cor', 'label' => 'San', 'value' => 'san', 'hex' => '#B8846C'],
                        ['tipo' => 'labios_cor', 'label' => 'Terracota', 'value' => 'terracota', 'hex' => '#C45A3F'],
                        ['tipo' => 'labios_cor', 'label' => 'True Love', 'value' => 'true-love', 'hex' => '#E99797'],
                        ['tipo' => 'labios_cor', 'label' => 'Utopia', 'value' => 'utopia', 'hex' => '#CE83C6']
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
