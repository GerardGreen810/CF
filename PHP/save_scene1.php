<?php
// novela/PHP/guardar_escena.php
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

require_once __DIR__ . '/db.php'; // debe exponer $pdo (PDO)

$body = file_get_contents('php://input');
$payload = json_decode($body, true);

$scene_slug = isset($payload['scene_slug']) ? trim($payload['scene_slug']) : null;
$scene_index = isset($payload['scene_index']) ? intval($payload['scene_index']) : null;
$raw_state = isset($payload['state_json']) ? $payload['state_json'] : null;

// Construir un objeto state mínimo si no se pasó nada
if (!$raw_state) {
    $stateArr = [
        'scene_slug' => $scene_slug,
        'scene_index' => $scene_index,
        'saved_at' => date('c')
    ];
    $raw_state = json_encode($stateArr);
} else if (!is_string($raw_state)) {
    // si viene en forma de array/objeto, convertir a string
    $raw_state = json_encode($raw_state);
}

try {
    $userId = (int)$_SESSION['user_id'];
    $pdo->beginTransaction();

    // opcional: intentar resolver scene_slug a scene_id
    $sceneId = null;
    if ($scene_slug) {
        $stmt = $pdo->prepare('SELECT id FROM scenes WHERE slug = :slug LIMIT 1');
        $stmt->execute([':slug' => $scene_slug]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($r && isset($r['id'])) $sceneId = (int)$r['id'];
    } elseif ($scene_index !== null) {
        // si te pasaron scene_index (1-based index), intenta mapear al slug
        $possibleSlug = 'scene_' . (intval($scene_index) + 1);
        $stmt = $pdo->prepare('SELECT id FROM scenes WHERE slug = :slug LIMIT 1');
        $stmt->execute([':slug' => $possibleSlug]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($r && isset($r['id'])) $sceneId = (int)$r['id'];
    }

    // Revisar si ya existe save para este user
    $sel = $pdo->prepare('SELECT id FROM saves WHERE user_id = :uid LIMIT 1');
    $sel->execute([':uid' => $userId]);
    $exists = $sel->fetch(PDO::FETCH_ASSOC);

    if ($exists && isset($exists['id'])) {
        $upd = $pdo->prepare('UPDATE saves SET scene_id = :scene_id, state_json = :state, updated_at = NOW() WHERE user_id = :uid');
        $upd->execute([
            ':scene_id' => ($sceneId !== null ? $sceneId : $scene_index),
            ':state' => $raw_state,
            ':uid' => $userId
        ]);
        $saveId = $exists['id'];
    } else {
        $ins = $pdo->prepare('INSERT INTO saves (user_id, scene_id, state_json) VALUES (:uid, :scene_id, :state)');
        $ins->execute([
            ':uid' => $userId,
            ':scene_id' => ($sceneId !== null ? $sceneId : $scene_index),
            ':state' => $raw_state
        ]);
        $saveId = $pdo->lastInsertId();
    }

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'Guardado correcto.', 'save' => [
        'id' => (int)$saveId,
        'scene_id' => $sceneId,
        'scene_slug' => $scene_slug,
        'state_json' => json_decode($raw_state, true)
    ]]);
    exit;
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
    exit;
}
