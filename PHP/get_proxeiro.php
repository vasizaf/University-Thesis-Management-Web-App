<?php
session_start();
require_once 'database.php';
header('Content-Type: application/json');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

$username = $_SESSION['username'];


$sql = "SELECT diplomatiki FROM analamvanei WHERE foititis = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
$stmt->close();

if ($result->num_rows === 0) {
    echo json_encode(['error' => 'Δεν σας έχει ανατεθεί διπλωματική εργασία.']);
    exit;
}

$diplomatiki_id = $result->fetch_assoc()['diplomatiki'];


$sql = "SELECT proxeiro_keimeno FROM exetasi WHERE diplomatiki = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $diplomatiki_id);
$stmt->execute();
$res = $stmt->get_result();
$stmt->close();

if ($res->num_rows === 0) {
    echo json_encode(['filename' => null]);
    exit;
}

$row = $res->fetch_assoc();
$fullPath = $row['proxeiro_keimeno'];

if (!$fullPath) {
    echo json_encode(['filename' => null]);
    exit;
}

//to onoma tou original arxeiou me to fullpath
$originalName = preg_replace("/^\d+_/", "", basename($fullPath));

echo json_encode([
    'filename' => $fullPath,
    'original' => $originalName
]);

$conn->close();
?>