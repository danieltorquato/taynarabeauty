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

        $stmt = $conn->prepare('SELECT id, nome, email, senha, role FROM usuarios WHERE email = :email LIMIT 1');
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
                'name' => $user['nome'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    }

    public function register() {
        header('Content-Type: application/json');
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        $name = isset($input['name']) ? trim($input['name']) : '';
        $email = isset($input['email']) ? trim($input['email']) : '';
        $phone = isset($input['phone']) ? trim($input['phone']) : '';
        $password = isset($input['password']) ? (string)$input['password'] : '';
        $role = isset($input['role']) ? trim($input['role']) : 'cliente';

        // Validações
        if ($name === '' || $email === '' || $phone === '' || $password === '') {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Todos os campos são obrigatórios']);
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Email inválido']);
            return;
        }

        if (strlen($password) < 6) {
            http_response_code(422);
            echo json_encode(['success' => false, 'message' => 'Senha deve ter pelo menos 6 caracteres']);
            return;
        }

        $db = new Database();
        $conn = $db->connect();

        // Verificar se email já existe
        $stmt = $conn->prepare('SELECT id FROM usuarios WHERE email = :email LIMIT 1');
        $stmt->bindParam(':email', $email);
        $stmt->execute();

        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Este email já está em uso']);
            return;
        }

        // Hash da senha
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // A coluna telefone já existe no banco de dados

        // Inserir novo usuário
        $stmt = $conn->prepare('INSERT INTO usuarios (nome, email, telefone, senha, role) VALUES (:name, :email, :phone, :password, :role)');
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':phone', $phone);
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':role', $role);

        if ($stmt->execute()) {
            $userId = $conn->lastInsertId();

            // Gerar token
            $token = base64_encode(random_bytes(24));

            echo json_encode([
                'success' => true,
                'message' => 'Conta criada com sucesso',
                'token' => $token,
                'user' => [
                    'id' => (int)$userId,
                    'name' => $name,
                    'email' => $email,
                    'role' => $role
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao criar conta']);
        }
    }
}
