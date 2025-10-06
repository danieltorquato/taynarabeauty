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

                    // Gerar opções dinâmicas para combos
                    foreach ($procedimentos as $procedimento) {
                        if ($procedimento['categoria'] === 'combo' || strpos(strtolower($procedimento['nome']), 'combo') !== false) {
                            $opcoesPorProcedimento[$procedimento['id']] = $this->gerarOpcoesCombo($opcoesPorProcedimento);
                        }
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
                    ['id' => 3, 'nome' => 'Cílios', 'categoria' => 'cilios'],
                    ['id' => 4, 'nome' => 'Lábios', 'categoria' => 'labios'],
                    ['id' => 5, 'nome' => 'Combo (Cílios + Lábios)', 'categoria' => 'labios']
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

    private function gerarOpcoesCombo($opcoesPorProcedimento) {
        try {
            $db = new Database();
            $conn = $db->connect();

            if (!$conn) {
                return [];
            }

            $opcoes = [];

            // Buscar combinações específicas de combo
            $stmt = $conn->query('
                SELECT
                    procedimento_id,
                    tipo,
                    label,
                    value,
                    preco_centavos,
                    duracao,
                    id_tipo_cilios,
                    id_cor_cilios,
                    id_cor_labios
                FROM procedimento_opcoes
                WHERE procedimento_id = 5 AND tipo = "combo_completo"
                ORDER BY preco_centavos, label
            ');
            $combinacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Adicionar todas as combinações específicas
            foreach ($combinacoes as $combo) {
                $opcoes[] = $combo;
            }

            return $opcoes;

        } catch (Throwable $e) {
            error_log('Erro gerarOpcoesCombo: ' . $e->getMessage());
            return [];
        }
    }

    public function getComboCombinacao() {
        try {
            $ciliosTipoId = $_GET['cilios_tipo_id'] ?? null;
            $ciliosCorId = $_GET['cilios_cor_id'] ?? null;
            $labiosCorId = $_GET['labios_cor_id'] ?? null;

            if (!$ciliosTipoId || !$ciliosCorId || !$labiosCorId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Parâmetros obrigatórios: cilios_tipo_id, cilios_cor_id, labios_cor_id']);
                return;
            }

            $db = new Database();
            $conn = $db->connect();

            if (!$conn) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Erro de conexão com o banco']);
                return;
            }

            $stmt = $conn->prepare('
                SELECT
                    cc.id,
                    cc.preco_centavos,
                    cc.duracao,
                    ct.nome as tipo_cilios,
                    cci.nome as cor_cilios,
                    lc.nome as cor_labios
                FROM combo_combinacoes cc
                JOIN cilios_tipos ct ON cc.cilios_tipo_id = ct.id
                JOIN cilios_cores cci ON cc.cilios_cor_id = cci.id
                JOIN labios_cores lc ON cc.labios_cor_id = lc.id
                WHERE cc.cilios_tipo_id = ? AND cc.cilios_cor_id = ? AND cc.labios_cor_id = ?
                AND cc.ativo = 1
            ');

            $stmt->execute([$ciliosTipoId, $ciliosCorId, $labiosCorId]);
            $combinacao = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($combinacao) {
                echo json_encode(['success' => true, 'combinacao' => $combinacao]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Combinação não encontrada']);
            }

        } catch (Throwable $e) {
            error_log('Erro getComboCombinacao: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
        }
    }
}
