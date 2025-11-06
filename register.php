<?php
include("conexion.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $conexion->real_escape_string($_POST['username']);
    $email = $conexion->real_escape_string($_POST['email']);
    $password = password_hash($_POST['password'], PASSWORD_BCRYPT);

    $sql = "INSERT INTO portal_users (username, email, password_hash) 
            VALUES ('$username', '$email', '$password')";

    if ($conexion->query($sql) === TRUE) {
        echo "Registro exitoso. <a href='index.php'>Inicia sesión aquí</a>";
    } else {
        echo "Error: " . $conexion->error;
    }
}
?>