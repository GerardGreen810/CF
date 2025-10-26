<?php
// novela/PHP/guardar_partida.php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
    exit;
}

session_start();

if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado.']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $userId = (int)$_SESSION['user_id'];

    // leer JSON
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true);
    if (!is_array($payload)) $payload = [];

    $scene_id = isset($payload['scene_id']) && $payload['scene_id'] !== '' ? intval($payload['scene_id']) : null;
    $scene_slug = isset($payload['scene_slug']) ? trim($payload['scene_slug']) : null;
    $state_json = isset($payload['state_json']) ? $payload['state_json'] : null;

    // si state_json es array/object -> encodearlo (si viene ya string, lo dejamos)
    if ($state_json !== null && !is_string($state_json)) {
        $state_json = json_encode($state_json, JSON_UNESCAPED_UNICODE);
    }

    // Si se nos pasó slug y no id, intentar resolver scene_id
    if (!$scene_id && $scene_slug) {
        $s = $pdo->prepare('SELECT id FROM scenes WHERE slug = :slug LIMIT 1');
        $s->execute([':slug' => $scene_slug]);
        $r = $s->fetch();
        if ($r && isset($r['id'])) $scene_id = (int)$r['id'];
    }

    // Comprobar si ya existe save para este user (UPSERT)
    $chk = $pdo->prepare('SELECT id FROM saves WHERE user_id = :uid LIMIT 1');
    $chk->execute([':uid' => $userId]);
    $existing = $chk->fetch();

    if ($existing && isset($existing['id'])) {
        // UPDATE
        $upd = $pdo->prepare('UPDATE saves SET scene_id = :scene_id, state_json = :state_json, updated_at = NOW() WHERE id = :id');
        $upd->execute([
            ':scene_id' => $scene_id,
            ':state_json' => $state_json,
            ':id' => $existing['id']
        ]);
        echo json_encode(['success' => true, 'message' => 'Partida actualizada.', 'save_id' => (int)$existing['id']]);
        exit;
    } else {
        // INSERT
        $ins = $pdo->prepare('INSERT INTO saves (user_id, scene_id, state_json) VALUES (:uid, :scene_id, :state_json)');
        $ins->execute([
            ':uid' => $userId,
            ':scene_id' => $scene_id,
            ':state_json' => $state_json
        ]);
        echo json_encode(['success' => true, 'message' => 'Partida guardada.', 'save_id' => (int)$pdo->lastInsertId()]);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
    exit;
}