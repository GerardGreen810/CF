<?php
// novela/PHP/db.php
// Archivo de conexión PDO

$DB_HOST = '127.0.0.1';
$DB_NAME = 'coatlis_faith';
$DB_USER = 'root';      
$DB_PASS = '';          
$DB_CHAR = 'utf8mb4';

$dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=$DB_CHAR";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // ver errores
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (PDOException $e) {
    // En desarrollo, es útil ver el error. En producción, cambia este comportamiento.
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos: ' . $e->getMessage()]);
    exit;
}