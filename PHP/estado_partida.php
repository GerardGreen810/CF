<?php
// novela/PHP/estado_partida.php
header('Content-Type: application/json; charset=utf-8');
session_start();

// Si no hay sesión iniciada, devolvemos "no_iniciada" (sin exponer detalles)
if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
    echo json_encode(['estado' => 'no_iniciada']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $userId = (int)$_SESSION['user_id'];

    // Buscar si existe un save para este usuario
    $stmt = $pdo->prepare('SELECT id, state_json, scene_id FROM saves WHERE user_id = :uid LIMIT 1');
    $stmt->execute([':uid' => $userId]);
    $row = $stmt->fetch();

    if ($row && (!empty($row['state_json']) || $row['scene_id'] !== null)) {
        echo json_encode(['estado' => 'iniciada']);
    } else {
        echo json_encode(['estado' => 'no_iniciada']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['estado' => 'no_iniciada', 'error' => $e->getMessage()]);
}
