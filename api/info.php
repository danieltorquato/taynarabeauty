<?php
// Arquivo de diagnóstico simples
echo "API FUNCIONANDO!<br>";
echo "Data/Hora: " . date('Y-m-d H:i:s') . "<br>";
echo "Servidor: " . ($_SERVER['SERVER_NAME'] ?? 'N/A') . "<br>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Pasta atual: " . __DIR__ . "<br>";
echo "Arquivo atual: " . __FILE__ . "<br>";
?>
