<?php
session_start();
require 'database.php';
require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

header('Content-Type: application/json');

if (!isset($_SESSION['diplomatiki_id'])) {
    echo json_encode(["error" => "Session ID not set"]);
    exit;
}

$diplomatiki_id = $_SESSION['diplomatiki_id'];

$sql = "SELECT tropos_exetasis, aithousa, link, imerominia, ora FROM exetasi WHERE diplomatiki = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["error" => "Database error: failed to prepare statement"]);
    exit;
}

$stmt->bind_param("i", $diplomatiki_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    $row['imerominia'] = $row['imerominia'] ? date("Y-m-d", strtotime($row['imerominia'])) : null;
    $row['ora'] = $row['ora'] ? date("H:i", strtotime($row['ora'])) : null;
    echo json_encode($row);
} else {
    echo json_encode(null);
}

$stmt->close();
$conn->close();
?>
