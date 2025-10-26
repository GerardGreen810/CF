<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

/*
 ────────────────────────────────────────────────
   get_dialog.php
   Permite obtener un diálogo ya sea:
   - Por clave directa (key)
   - Por señal de evento (signal)
 ────────────────────────────────────────────────
*/

$key = $_GET['key'] ?? '';
$signal = $_GET['signal'] ?? '';

if (!$key && !$signal) {
    echo json_encode(['success' => false, 'message' => 'No se especificó ni dialog_key ni trigger_signal']);
    exit;
}

try {
    if ($signal) {
        // Buscar el diálogo asociado al trigger_signal
        $stmt = $pdo->prepare("
            SELECT d.id, d.dialog_key, d.title, d.meta
            FROM dialog_triggers dt
            JOIN dialogs d ON d.id = dt.dialog_id
            WHERE dt.trigger_signal = :signal AND dt.active = 1
            LIMIT 1
        ");
        $stmt->execute(['signal' => $signal]);
        $dialog = $stmt->fetch();
    } else {
        // Buscar el diálogo directamente por key
        $stmt = $pdo->prepare("SELECT id, dialog_key, title, meta FROM dialogs WHERE dialog_key = :key LIMIT 1");
        $stmt->execute(['key' => $key]);
        $dialog = $stmt->fetch();
    }

    if (!$dialog) {
        echo json_encode(['success' => false, 'message' => 'Diálogo no encontrado']);
        exit;
    }

    // Obtener todas las líneas del diálogo
    $stmt2 = $pdo->prepare("
        SELECT ordering, speaker, text, sfx_role, sfx_path, choices
        FROM dialog_lines
        WHERE dialog_id = :id
        ORDER BY ordering ASC
    ");
    $stmt2->execute(['id' => $dialog['id']]);
    $lines = $stmt2->fetchAll();

    // Decodificar meta si es JSON válido
    $meta = $dialog['meta'];
    if ($meta && ($decoded = json_decode($meta, true))) {
        $meta = $decoded;
    }

    echo json_encode([
        'success' => true,
        'dialog_key' => $dialog['dialog_key'],
        'title' => $dialog['title'],
        'meta' => $meta,
        'lines' => $lines
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error interno: ' . $e->getMessage()]);
}