<?php
// Basic CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/Config/Timezone.php';
require_once __DIR__ . '/Config/Database.php';

spl_autoload_register(function ($class) {
    $paths = [
        __DIR__ . '/Controllers/' . $class . '.php',
        __DIR__ . '/Models/' . $class . '.php',
        __DIR__ . '/Config/' . $class . '.php',
    ];
    foreach ($paths as $path) {
        if (file_exists($path)) {
            require_once $path;
            return;
        }
    }
});

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$route = '/' . trim(str_replace($scriptName, '', $uri), '/');

// Normalize base /api
if (str_starts_with($route, 'api')) {
    $route = '/' . substr($route, 3);
}

// CORREÇÃO: Rota para a raiz da API
if ($route === '/' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'API Taynara Beauty funcionando!',
        'version' => '1.0.0',
        'endpoints' => [
            'POST /auth/login' => 'Login de usuário',
            'POST /auth/register' => 'Registro de usuário',
            'GET /procedimentos' => 'Listar procedimentos',
            'GET /profissionais' => 'Listar profissionais',
            'POST /profissionais' => 'Criar profissional',
            'PUT /profissionais/{id}' => 'Atualizar profissional',
            'DELETE /profissionais/{id}' => 'Excluir profissional',
            'GET /horarios' => 'Listar horários disponíveis',
            'POST /agendamentos' => 'Criar agendamento',
            'GET /agendamentos' => 'Listar agendamentos',
            'GET /meus-agendamentos' => 'Meus agendamentos'
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// CORREÇÃO: Permitir acesso direto a arquivos PHP específicos
$requestedFile = basename($uri);
if (in_array($requestedFile, ['info.php', 'test.php', 'simple-test.php', 'direct-test.php', 'api.php'])) {
    // Se for um arquivo de teste específico, incluir diretamente
    $filePath = __DIR__ . '/' . $requestedFile;
    if (file_exists($filePath)) {
        include $filePath;
        exit;
    }
}

// Simple router
if ($route === '/auth/login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AuthController();
    $controller->login();
    exit;
}

if ($route === '/auth/register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AuthController();
    $controller->register();
    exit;
}

if ($route === '/agendamentos' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AgendamentosController();
    $controller->create();
    exit;
}

if ($route === '/agendamentos' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new AgendamentosController();
    $controller->listar();
    exit;
}

if (preg_match('/^\/agendamentos\/(\d+)\/status$/', $route, $matches) && $_SERVER['REQUEST_METHOD'] === 'PUT') {
    $controller = new AgendamentosController();
    $controller->updateStatus($matches[1]);
    exit;
}

if ($route === '/agendamentos/atualizar-expirados' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AgendamentosController();
    $controller->atualizarExpirados();
    exit;
}

if (preg_match('/^\/agendamentos\/(\d+)\/cancelar$/', $route, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AgendamentosController();
    $controller->cancelar($matches[1]);
    exit;
}

if (preg_match('/^\/agendamentos\/(\d+)\/rejeitar$/', $route, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AgendamentosController();
    $controller->rejeitar($matches[1]);
    exit;
}

if (preg_match('/^\/agendamentos\/(\d+)\/faltou$/', $route, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AgendamentosController();
    $controller->marcarFalta($matches[1]);
    exit;
}

if (preg_match('/^\/agendamentos\/(\d+)\/desmarcar$/', $route, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AgendamentosController();
    $controller->desmarcar($matches[1]);
    exit;
}

// Horários
if ($route === '/horarios' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new HorariosController();
    $controller->listar();
    exit;
}

// Procedimentos
if ($route === '/procedimentos' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new ProcedimentosController();
    $controller->listar();
    exit;
}

if ($route === '/combo/combinacao' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new ProcedimentosController();
    $controller->getComboCombinacao();
    exit;
}

// Profissionais
if ($route === '/profissionais' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new ProfissionaisController();
    $controller->listar();
    exit;
}

if ($route === '/profissionais' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new ProfissionaisController();
    $controller->criar();
    exit;
}

if (preg_match('/^\/profissionais\/(\d+)$/', $route, $matches) && $_SERVER['REQUEST_METHOD'] === 'PUT') {
    $controller = new ProfissionaisController();
    $controller->atualizar($matches[1]);
    exit;
}

if (preg_match('/^\/profissionais\/(\d+)$/', $route, $matches) && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $controller = new ProfissionaisController();
    $controller->excluir($matches[1]);
    exit;
}

// Admin
if ($route === '/admin/agendamentos' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new AdminController();
    $controller->listarAgendamentos();
    exit;
}

if ($route === '/admin/dashboard' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new AdminController();
    $controller->dashboard();
    exit;
}

// Admin Horários
if ($route === '/admin/horarios/salvar-batch' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new HorariosController();
    $controller->salvarBatch();
    exit;
}

// Usuários
if ($route === '/usuarios' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new UsuariosController();
    $controller->listar();
    exit;
}

// Meus Agendamentos
if ($route === '/meus-agendamentos' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new MeusAgendamentosController();
    $controller->listar();
    exit;
}

if (preg_match('/^\/meus-agendamentos\/(\d+)\/cancelar$/', $route, $matches) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new MeusAgendamentosController();
    $controller->cancelar($matches[1]);
    exit;
}

// CORREÇÃO: Resposta mais informativa para debug
http_response_code(404);
header('Content-Type: application/json');
echo json_encode([
    'success' => false,
    'message' => 'Not Found',
    'debug' => [
        'route' => $route,
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $uri,
        'script_name' => $scriptName
    ]
]);
