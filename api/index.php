<?php
// Basic CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

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

// Simple router
if ($route === '/auth/login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AuthController();
    $controller->login();
    exit;
}

if ($route === '/agendamentos' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new AgendamentosController();
    $controller->create();
    exit;
}

if ($route === '/procedimentos' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new ProcedimentosController();
    $controller->listar();
    exit;
}

if ($route === '/profissionais' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new ProfissionaisController();
    $controller->listar();
    exit;
}

if ($route === '/horarios' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new HorariosController();
    $controller->listar();
    exit;
}

if ($route === '/admin/dashboard' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new AdminController();
    $controller->dashboard();
    exit;
}

if ($route === '/admin/agendamentos' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new AdminController();
    $controller->listarAgendamentos();
    exit;
}

if ($route === '/admin/horarios/liberar-dia' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new HorariosController();
    $controller->liberarDia();
    exit;
}

if ($route === '/admin/horarios/liberar-semana' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new HorariosController();
    $controller->liberarSemana();
    exit;
}

if ($route === '/admin/horarios/liberar-horario' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new HorariosController();
    $controller->liberarHorarioEspecifico();
    exit;
}

if ($route === '/admin/horarios/bloquear-horario' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new HorariosController();
    $controller->bloquearHorarioEspecifico();
    exit;
}

if ($route === '/admin/horarios/bloquear-dia' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new HorariosController();
    $controller->bloquearDia();
    exit;
}

if ($route === '/admin/horarios/salvar-batch' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $controller = new HorariosController();
    $controller->salvarBatch();
    exit;
}

// Gestão de Profissionais
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

// Usuários
if ($route === '/usuarios' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new UsuariosController();
    $controller->listar();
    exit;
}

http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['success' => false, 'message' => 'Not Found']);


