<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

$slug = $_GET['slug'] ?? '';

if (!$slug) {
    echo json_encode(['success' => false, 'message' => 'Slug no especificado']);
    exit;
}

try {
    // Buscar escena
    $stmt = $pdo->prepare("SELECT id, slug, title, description FROM scenes WHERE slug = ?");
    $stmt->execute([$slug]);
    $scene = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$scene) {
        echo json_encode(['success' => false, 'message' => 'Escena no encontrada']);
        exit;
    }

    // Buscar assets asociados
    $stmt2 = $pdo->prepare("
        SELECT a.type, a.path, a.name, sa.role, sa.ordering
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
        $assets[$a['role']][] = [
            'type' => $a['type'],
            'path' => $a['path'],
            'name' => $a['name'],
            'ordering' => $a['ordering']
        ];
    }

    // Buscar eventos asociados (si los hubiera)
    $stmt3 = $pdo->prepare("SELECT * FROM events WHERE scene_id = ? AND active = 1 ORDER BY ordering ASC");
    $stmt3->execute([$scene['id']]);
    $events = $stmt3->fetchAll(PDO::FETCH_ASSOC);

    // Armar respuesta JSON
    $response = [
        'success' => true,
        'scene' => $scene,   // ahora incluye slug
        'assets' => $assets, // ya agrupado por rol
        'events' => $events,
    ];

    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error interno: ' . $e->getMessage()]);
}
?>