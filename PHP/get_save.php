<?php
// novela/PHP/get_save.php
header('Content-Type: application/json; charset=utf-8');
session_start();

if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado.']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $userId = (int)$_SESSION['user_id'];

    // tomamos el save más reciente del usuario
    $stmt = $pdo->prepare('SELECT s.id, s.scene_id, s.state_json, s.updated_at, sc.slug AS scene_slug FROM saves s LEFT JOIN scenes sc ON s.scene_id = sc.id WHERE s.user_id = :uid ORDER BY s.updated_at DESC LIMIT 1');
    $stmt->execute([':uid' => $userId]);
    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode(['success' => false, 'message' => 'No hay partida guardada.']);
        exit;
    }

    // intentar decodificar state_json si es JSON
    $state = null;
    if ($row['state_json'] !== null && $row['state_json'] !== '') {
        $decoded = json_decode($row['state_json'], true);
        $state = (json_last_error() === JSON_ERROR_NONE) ? $decoded : $row['state_json'];
    }

    $save = [
        'id' => (int)$row['id'],
        'scene_id' => $row['scene_id'] !== null ? (int)$row['scene_id'] : null,
        'scene_slug' => $row['scene_slug'] !== null ? $row['scene_slug'] : null,
        'state_json' => $state,
        'updated_at' => $row['updated_at']
    ];

    echo json_encode(['success' => true, 'save' => $save]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
    exit;
}