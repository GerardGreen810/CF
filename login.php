<?php
session_start();
include("conexion.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_POST['username'];
    $password = $_POST['password'];

    // Buscar usuario en la nueva tabla 'portal_users'
    $sql = "SELECT * FROM portal_users WHERE username='$username' LIMIT 1";
    $resultado = $conexion->query($sql);

    if ($resultado->num_rows > 0) {
        $usuario = $resultado->fetch_assoc();
        if (password_verify($password, $usuario['password_hash'])) {
            $_SESSION['usuario'] = $usuario['username'];
            header("Location: index.php");
            exit;
        } else {
            echo "Contraseña incorrecta.";
        }
    } else {
        echo "Usuario no encontrado.";
    }
}
?>