<?php
class AuthController {
    public function login() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = isset($input['email']) ? trim($input['email']) : '';
        $password = isset($input['password']) ? (string)$input['password'] : '';

        if ($email === '' || $password === '') {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'E-mail e senha são obrigatórios']);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        $stmt = $conn->prepare('SELECT id, nome, email, senha FROM usuarios WHERE email = :email LIMIT 1');
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Credenciais inválidas']);
            return;
        }

        $senhaHashOuTexto = (string)$user['senha'];
        $isHash = str_starts_with($senhaHashOuTexto, '$2y$') || str_starts_with($senhaHashOuTexto, '$argon2') || strlen($senhaHashOuTexto) > 30;
        $isValid = $isHash ? password_verify($password, $senhaHashOuTexto) : hash_equals($senhaHashOuTexto, $password);

        if (!$isValid) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Credenciais inválidas']);
            return;
        }

        $token = base64_encode(random_bytes(24));

        echo json_encode([
            'success' => true,
            'message' => 'Login efetuado com sucesso',
            'token' => $token,
            'user' => [
                'id' => (int)$user['id'],
                'nome' => $user['nome'],
                'email' => $user['email']
            ]
        ]);
    }
}
