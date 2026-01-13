<?php
session_start();
header('Content-Type: application/json');

include('database.php');

file_put_contents("debug_raw.txt", file_get_contents("php://input"));
file_put_contents("debug_post.txt", print_r($_POST, true));

require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

if (empty($_POST)) {
    $data = json_decode(file_get_contents("php://input"), true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
        $_POST = $data;
    }
}

$email = isset($_POST['email']) ? trim($_POST['email']) : null;
$kinito = isset($_POST['kinito']) ? trim($_POST['kinito']) : null;
$stathero = isset($_POST['stathero']) ? trim($_POST['stathero']) : null;
$dieuthinsi = isset($_POST['dieuthinsi']) ? trim($_POST['dieuthinsi']) : null;

//dieuthinsi kai email mono xreiazetai
if (!$email || !$dieuthinsi) {
    echo json_encode(['error' => 'Missing required input']);
    exit;
}

$username = $_SESSION['username'];

$sql = "UPDATE foititis SET email = ?, kinito = ?, stathero = ?, dieuthinsi = ? WHERE username = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['error' => 'Prepare failed: ' . $conn->error]);
    exit;
}

$stmt->bind_param("sssss", $email, $kinito, $stathero, $dieuthinsi, $username);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['error' => 'Execute failed: ' . $stmt->error]);
}

$stmt->close();

$conn->close();