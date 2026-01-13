<?php
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once 'database.php'; // $conn

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$professor = $_SESSION['username'];
$thesisId  = isset($_POST['thesisId']) ? (int)$_POST['thesisId'] : 0;
$switchVal = isset($_POST['switchValue']) ? trim($_POST['switchValue']) : '';

if (!$thesisId || ($switchVal !== 'True' && $switchVal !== 'False')) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid parameters']);
    exit;
}

$stmt = $conn->prepare("SELECT epivlepontas FROM diplomatiki WHERE id = ?");
$stmt->bind_param('i', $thesisId);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Thesis not found']);
    exit;
}

if ($row['epivlepontas'] !== $professor) {
    http_response_code(403);
    echo json_encode(['error' => 'You are not supervisor for this thesis']);
    exit;
}

$upd = $conn->prepare("UPDATE diplomatiki SET `switch` = ? WHERE id = ?");
$upd->bind_param('si', $switchVal, $thesisId);
if (!$upd->execute()) {
    http_response_code(500);
    echo json_encode(['error' => 'Update failed: ' . $upd->error]);
    exit;
}
$upd->close();
$conn->close();

echo json_encode(['success' => true]);
exit;
