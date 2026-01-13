<?php
session_start();
include('database.php');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('grammateia');

$username = $_SESSION['username'];

$sql = "SELECT username, onoma, eponimo, email, tilefono FROM grammateia WHERE username = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $data = $result->fetch_assoc();
    echo json_encode($data);
} else {
    echo json_encode(['error' => 'User not found']);
}

$stmt->close();
$conn->close();
?>
