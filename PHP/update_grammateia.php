<?php
session_start();
include('database.php');
header('Content-Type: application/json');
require_once __DIR__ . '/auth_check.php';
require_role_or_die('grammateia');

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Σφάλμα σύνδεσης με τη βάση."]);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
        echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
        exit;
    }

    $username = $data['username'] ?? '';
    $email    = $data['email'] ?? '';
    $tilefono = $data['tilefono'] ?? '';

    $stmt = $conn->prepare("UPDATE grammateia SET email = ?, tilefono = ? WHERE username = ?");
    $stmt->bind_param('sss', $email, $tilefono, $username);
    $success = $stmt->execute();
    $stmt->close();
    $conn->close();

    echo json_encode(['success' => $success]);
}
