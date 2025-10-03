<?php
class Database {
    private $host = "localhost";
    private $db_name = "u576486711_taynarabeauty";
    private $username = "u576486711_danieltorq";
    private $password = "SUA_SENHA_REAL_AQUI";
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
