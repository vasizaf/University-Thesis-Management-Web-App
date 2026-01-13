<?php
session_start();

include('../PHP/database.php');
require_once __DIR__ . '/auth_check.php';
require_role_or_die('grammateia');

if ($_SERVER["REQUEST_METHOD"] === "GET") {

    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
    }

    $stmt = $conn->prepare("SELECT * FROM grammateia");
    if (!$stmt) {
        die(json_encode(["error" => "Failed to prepare statement."]));
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $gram = [];
    while ($row = $result->fetch_assoc()) {
        $gram[] = $row;
    }

    $stmt->close();
    $conn->close();

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        "count" => count($gram),
        "gram" => $gram,
    ]);
}
?>
