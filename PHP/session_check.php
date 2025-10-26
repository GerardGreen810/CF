<?php
// novela/PHP/session_check.php
header('Content-Type: application/json; charset=utf-8');
session_start();

if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
    echo json_encode([
        'logged' => true,
        'user_id' => (int)$_SESSION['user_id'],
        'username' => isset($_SESSION['username']) ? $_SESSION['username'] : null
    ]);
} else {
    echo json_encode(['logged' => false]);
}