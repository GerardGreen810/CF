<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$slug = $_GET['slug'] ?? '';

if (!$slug) {
    echo json_encode(['success' => false, 'message' => 'Slug no especificado']);
    exit;
}

try {
    // Seleccionamos también format y meta
    $stmt = $pdo->prepare("SELECT id, slug, title, description, `format`, meta, created_at FROM scenes WHERE slug = ?");
    $stmt->execute([$slug]);
    $scene = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$scene) {
        echo json_encode(['success' => false, 'message' => 'Escena no encontrada']);
        exit;
    }

    // Buscar assets asociados (incluimos id y meta)
    $stmt2 = $pdo->prepare("
        SELECT a.id as asset_id, a.type, a.path, a.name, a.meta AS asset_meta, sa.role, sa.ordering
        FROM scene_assets sa
        JOIN assets a ON sa.asset_id = a.id
        WHERE sa.scene_id = ?
        ORDER BY sa.ordering ASC
    ");
    $stmt2->execute([$scene['id']]);
    $assetsRaw = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    // Convertir assets a objeto por role
    $assets = [];
    foreach ($assetsRaw as $a) {
        if (!isset($assets[$a['role']])) $assets[$a['role']] = [];
        // intentar decodificar meta del asset si es JSON
        $assetMeta = null;
        if ($a['asset_meta'] !== null && $a['asset_meta'] !== '') {
            $decoded = json_decode($a['asset_meta'], true);
            $assetMeta = ($decoded === null) ? $a['asset_meta'] : $decoded;
        }
        $assets[$a['role']][] = [
            'id' => (int)$a['asset_id'],
            'type' => $a['type'],
            'path' => $a['path'],
            'name' => $a['name'],
            'ordering' => (int)$a['ordering'],
            'meta' => $assetMeta
        ];
    }

    // Buscar eventos activos asociados (decodificamos fields JSON para que lleguen como objetos al navegador)
    $stmt3 = $pdo->prepare("SELECT id, scene_id, trigger_type, trigger_signal, conditions, actions, active, ordering FROM events WHERE scene_id = ? AND active = 1 ORDER BY ordering ASC");
    $stmt3->execute([$scene['id']]);
    $eventsRaw = $stmt3->fetchAll(PDO::FETCH_ASSOC);

    $events = [];
    foreach ($eventsRaw as $ev) {
        // decodificar conditions/actions si son JSON válidos
        $conditions = null;
        if (!is_null($ev['conditions']) && $ev['conditions'] !== '') {
            $c = json_decode($ev['conditions'], true);
            $conditions = ($c === null) ? $ev['conditions'] : $c;
        }
        $actions = null;
        if (!is_null($ev['actions']) && $ev['actions'] !== '') {
            $a = json_decode($ev['actions'], true);
            $actions = ($a === null) ? $ev['actions'] : $a;
        }
        $events[] = [
            'id' => (int)$ev['id'],
            'scene_id' => (int)$ev['scene_id'],
            'trigger_type' => $ev['trigger_type'],
            'trigger_signal' => $ev['trigger_signal'],
            'conditions' => $conditions,
            'actions' => $actions,
            'active' => (bool)$ev['active'],
            'ordering' => (int)$ev['ordering']
        ];
    }

    // Asegurarnos de que scene.meta venga como string o ya decodificado:
    $sceneMeta = null;
    if (!is_null($scene['meta']) && $scene['meta'] !== '') {
        $m = json_decode($scene['meta'], true);
        $sceneMeta = ($m === null) ? $scene['meta'] : $m;
    }
    // Normalizar salida de escena (incluimos format y meta)
    $sceneOut = [
        'id' => (int)$scene['id'],
        'slug' => $scene['slug'],
        'title' => $scene['title'],
        'description' => $scene['description'],
        'format' => $scene['format'] ?? 'side_scroll',
        'meta' => $sceneMeta,
        'created_at' => $scene['created_at'] ?? null
    ];

    $response = [
        'success' => true,
        'scene' => $sceneOut,
        'assets' => $assets,
        'events' => $events,
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error interno: ' . $e->getMessage()]);
}