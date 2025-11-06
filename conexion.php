<?php
$conexion = new mysqli("localhost", "root", "", "coatlis_faith");

if ($conexion->connect_error) {
    die("Error de conexión: " . $conexion->connect_error);
}
?>