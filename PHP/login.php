<?php
// novela/PHP/login.php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
    exit;
}

$input = $_POST;
if (empty($input)) {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (is_array($data)) $input = $data;
}

$username = isset($input['username']) ? trim($input['username']) : '';
$password = isset($input['password']) ? $input['password'] : '';

if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Completa usuario y contraseña.']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE username = :username LIMIT 1');
    $stmt->execute([':username' => $username]);
    $row = $stmt->fetch();

    if (!$row || !password_verify($password, $row['password_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Usuario o contraseña incorrectos.']);
        exit;
    }

    // Inicio de sesión
    session_start();
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$row['id'];
    $_SESSION['username'] = $username;

    // actualizar last_login (opcional)
    $update = $pdo->prepare('UPDATE users SET last_login = NOW() WHERE id = :id');
    $update->execute([':id' => $row['id']]);

    echo json_encode(['success' => true, 'message' => 'Inicio de sesión correcto.', 'user_id' => (int)$row['id']]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
    exit;
}