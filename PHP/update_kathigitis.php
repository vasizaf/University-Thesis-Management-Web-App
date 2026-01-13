<?php
session_start();
include 'database.php';
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$username = $_SESSION['username'] ?? null;
$email    = $_POST['email']    ?? null;
$tilefono = $_POST['tilefono'] ?? null;

if (!$email || !$tilefono) {
    echo json_encode(['error' => 'Missing email or phone']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['error' => 'Invalid email']);
    exit;
}
if (!preg_match('/^[0-9]{6,14}$/', $tilefono)) {
    echo json_encode(['error' => 'Invalid phone']);
    exit;
}

$sql = "UPDATE kathigitis
        SET email = ?, tilefono = ?
        WHERE username = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
    exit;
}

$stmt->bind_param('sss', $email, $tilefono, $username);
if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['error' => 'Update failed: ' . $stmt->error]);
}
$stmt->close();
$conn->close();
