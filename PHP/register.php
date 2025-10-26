<?php
// novela/PHP/register.php
header('Content-Type: application/json; charset=utf-8');

// Aceptar sólo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
    exit;
}

// Leer datos (form-data / x-www-form-urlencoded o JSON)
$input = $_POST;
if (empty($input)) {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (is_array($data)) $input = $data;
}

// Inicializar variables de forma segura
$username = isset($input['username']) ? trim((string)$input['username']) : '';
$password = isset($input['password']) ? (string)$input['password'] : '';
$password_confirm = isset($input['password_confirm']) ? (string)$input['password_confirm'] : '';
$email = isset($input['email']) ? trim((string)$input['email']) : null; // Opcional

// Validaciones básicas
if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Completa usuario y contraseña.']);
    exit;
}

if ($password !== $password_confirm) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Las contraseñas no coinciden.']);
    exit;
}

if (strlen($username) < 3) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El nombre de usuario debe tener al menos 3 caracteres.']);
    exit;
}

// Si se envió email, validarlo
if ($email !== null && $email !== '') {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email no válido.']);
        exit;
    }
}

// Conectar DB
require_once __DIR__ . '/db.php';

try {
    // Evitar colisiones por race: podríamos usar transaction + lock si es necesario
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username LIMIT 1');
    $stmt->execute([':username' => $username]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'El nombre de usuario ya existe. Elige otro.']);
        exit;
    }

    // Insertar usuario (añadimos email si lo tenemos)
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    if ($email !== null && $email !== '') {
        $insert = $pdo->prepare('INSERT INTO users (username, password_hash, email) VALUES (:username, :ph, :email)');
        $insert->execute([
            ':username' => $username,
            ':ph' => $password_hash,
            ':email' => $email
        ]);
    } else {
        $insert = $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (:username, :ph)');
        $insert->execute([
            ':username' => $username,
            ':ph' => $password_hash
        ]);
    }

    $userId = $pdo->lastInsertId();

    // Iniciar sesión automáticamente
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$userId;
    $_SESSION['username'] = $username;

    echo json_encode(['success' => true, 'message' => 'Registro exitoso. Sesión iniciada.', 'user_id' => (int)$userId]);
    exit;

} catch (Exception $e) {
    // Registrar el error en logs (no lo imprimimos directamente)
    error_log('[register.php] Exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor. Intenta más tarde.']);
    exit;
}