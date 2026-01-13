<?php
session_start();
include('database.php');
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['logged_in'], $_SESSION['role'], $_SESSION['username'])) {
    http_response_code(401);
    echo json_encode(['error'=>'Not authorized']);
    exit;
}

$thesisId = isset($_GET['thesisId']) ? intval($_GET['thesisId']) : 0;
if (!$thesisId) {
    http_response_code(400);
    echo json_encode(['error'=>'Missing thesisId']);
    exit;
}

$sql = "SELECT id, author, content, created_at, updated_at FROM announcements WHERE diplomatiki_id = ? LIMIT 1";
$stmt = $conn->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['error'=>$conn->error]); exit; }
$stmt->bind_param('i', $thesisId);
$stmt->execute();
$res = $stmt->get_result();
$ann = $res->fetch_assoc();
$stmt->close();

echo json_encode(['announcement' => $ann ?: null]);
exit;
