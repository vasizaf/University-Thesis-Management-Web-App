<?php
session_start();
include('database.php');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$username = $_SESSION['username'] ?? null;

if (!$username) {
    echo json_encode(['error' => 'Missing username']);
    exit;
}

$sql = "SELECT username, onoma, eponimo, profession, email, tilefono FROM kathigitis WHERE username = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['error' => 'Καθηγητής not found']);
    exit;
}

$data = $result->fetch_assoc();
echo json_encode($data);
$stmt->close();
$conn->close();
?>
