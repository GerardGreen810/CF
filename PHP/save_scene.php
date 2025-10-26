<?php
// novela/PHP/save_scene.php
header('Content-Type: application/json; charset=utf-8');
session_start();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'message' => 'Método no permitido. Usa POST.']);
  exit;
}
if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
  http_response_code(401);
  echo json_encode(['success' => false, 'message' => 'No autenticado.']);
  exit;
}
require_once __DIR__ . '/db.php';
$userId = (int) $_SESSION['user_id'];

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) $input = [];

$scene_id = isset($input['scene_id']) && is_numeric($input['scene_id']) ? (int)$input['scene_id'] : null;
$scene_slug = isset($input['scene_slug']) ? trim($input['scene_slug']) : null;
$scene_index = isset($input['scene_index']) && is_numeric($input['scene_index']) ? (int)$input['scene_index'] : null;
$state_json = isset($input['state_json']) ? $input['state_json'] : null;

try {
  // Try derive scene_id from slug if missing
  if (!$scene_id && $scene_slug) {
    $stmt = $pdo->prepare('SELECT id FROM scenes WHERE slug = :slug LIMIT 1');
    $stmt->execute([':slug' => $scene_slug]);
    $r = $stmt->fetch();
    if ($r) $scene_id = (int)$r['id'];
  }

  // If still missing, derive from index (+1)
  if (!$scene_id && ($scene_index !== null)) {
    $scene_id = $scene_index + 1;
  }

  // Normalize state_json to stored JSON string
  if ($state_json === null) {
    $state_json = json_encode(['saved_at' => date(DATE_ATOM)]);
  } else if (!is_string($state_json)) {
    $state_json = json_encode($state_json);
  }

  // Check existing save
  $stmt = $pdo->prepare('SELECT id FROM saves WHERE user_id = :uid LIMIT 1');
  $stmt->execute([':uid' => $userId]);
  $existing = $stmt->fetch();

  if ($existing) {
    $upd = $pdo->prepare('UPDATE saves SET scene_id = :scene_id, state_json = :state_json, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
    $upd->execute([':scene_id' => $scene_id, ':state_json' => $state_json, ':id' => $existing['id']]);
  } else {
    $ins = $pdo->prepare('INSERT INTO saves (user_id, scene_id, state_json) VALUES (:uid, :scene_id, :state_json)');
    $ins->execute([':uid' => $userId, ':scene_id' => $scene_id, ':state_json' => $state_json]);
  }

  echo json_encode(['success' => true, 'message' => 'Guardado OK', 'scene_id' => $scene_id, 'scene_slug' => $scene_slug]);
  exit;
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
  exit;
}
