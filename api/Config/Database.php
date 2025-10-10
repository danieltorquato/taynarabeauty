<?php
// Configurar timezone para Brasil
date_default_timezone_set('America/Sao_Paulo');

class Database {
    private $host = "193.203.175.216";
    private $db_name = "u576486711_taybeauty";
    private $username = "u576486711_danieltorq";
    private $password = "Daaniell992312!";
    public $conn;

    public function connect() {
        $this->conn = null;
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $exception) {
            error_log("Erro na conexão: " . $exception->getMessage());
            echo "Erro na conexão: " . $exception->getMessage();
        }
        return $this->conn;
    }
}
?>
