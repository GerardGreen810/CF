<?php
// novela/PHP/delete_account.php
header('Content-Type: application/json; charset=utf-8');

// Aceptar solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
    exit;
}

// Iniciar sesión (si no hay sesión, no puede borrar)
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado.']);
    exit;
}

// Leer payload (JSON o form)
$input = $_POST;
if (empty($input)) {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (is_array($data)) $input = $data;
}

$password = isset($input['password']) ? (string)$input['password'] : '';

if ($password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Proporciona la contraseña para confirmar.']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $userId = (int)$_SESSION['user_id'];

    // Obtener hash de la BD
    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $userId]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado.']);
        exit;
    }

    if (!password_verify($password, $row['password_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta.']);
        exit;
    }

    // Aquí puedes borrar datos relacionados si es necesario (saves, progresos, etc.)
    // Recomendación: usar transacción.
    $pdo->beginTransaction();

    // EJEMPLO: si tienes tablas relacionadas, borralas explícitamente aquí:
    // $stmt = $pdo->prepare('DELETE FROM saves WHERE user_id = :uid'); $stmt->execute([':uid' => $userId]);

    // Borrar usuario
    $del = $pdo->prepare('DELETE FROM users WHERE id = :id');
    $del->execute([':id' => $userId]);

    $pdo->commit();

    // Destruir sesión
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();

    echo json_encode(['success' => true, 'message' => 'Cuenta eliminada correctamente.']);
    exit;

} catch (Exception $e) {
    // registrar error sin filtrarlo al cliente
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[delete_account.php] Exception: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor. Intenta más tarde.']);
    exit;
}