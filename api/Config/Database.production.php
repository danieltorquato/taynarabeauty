<?php
/**
 * Configuração de banco de dados para PRODUÇÃO
 * 
 * IMPORTANTE: Altere estas configurações para seu servidor de hospedagem
 * 
 * Configurações comuns de hospedagem:
 * - Host: localhost (mais comum)
 * - Porta: 3306 (padrão MySQL)
 * - Nome do banco: geralmente prefixado com nome de usuário
 * - Usuário: fornecido pela hospedagem
 * - Senha: definida por você no painel
 */

class Database {
    // CONFIGURAÇÕES DA SUA HOSPEDAGEM
    private $host = "localhost";                    // Host do banco (geralmente localhost)
    private $port = "3306";                        // Porta do MySQL (geralmente 3306)
    private $db_name = "taynarabeauty_prod";        // Nome do banco (com prefixo da hospedagem)
    private $username = "taynarabeauty_user";       // Usuário do banco
    private $password = "sua_senha_aqui";           // Senha do banco
    private $charset = "utf8mb4";
    public $conn;

    public function connect() {
        $this->conn = null;
        
        try {
            // DSN com porta explícita
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=" . $this->charset;
            
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // Configurações adicionais para produção
            $this->conn->exec("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'");
            
        } catch(PDOException $exception) {
            // Log do erro para debug
            error_log("Erro de conexão com banco: " . $exception->getMessage());
            
            // Retornar erro mais amigável
            throw new Exception("Erro de conexão com banco de dados. Verifique as configurações.");
        }
        
        return $this->conn;
    }
    
    /**
     * Testa a conexão sem retornar erro
     */
    public function testConnection() {
        try {
            $this->connect();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}
?>
