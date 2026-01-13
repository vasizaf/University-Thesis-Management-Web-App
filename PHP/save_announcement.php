<?php
session_start();
include('database.php');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$thesisId = isset($_POST['thesisId']) ? intval($_POST['thesisId']) : 0;
$content = isset($_POST['content']) ? trim($_POST['content']) : '';

if (!$thesisId) {
    http_response_code(400);
    echo json_encode(['error'=>'Missing thesisId']);
    exit;
}

// check gia adeio announcement
if ($content === '') {
    http_response_code(400);
    echo json_encode(['error'=>'Empty content']);
    exit;
}

//check ean einai o epivlepontas
$sql = "SELECT epivlepontas FROM diplomatiki WHERE id = ? LIMIT 1";
$stmt = $conn->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['error'=>$conn->error]); exit; }
$stmt->bind_param('i', $thesisId);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(['error'=>'Thesis not found']);
    exit;
}

if ($row['epivlepontas'] !== $_SESSION['username']) {
    http_response_code(403);
    echo json_encode(['error'=>'Only the epivlepontas can save the announcement']);
    exit;
}

//checkaroume ean exei ginei i exetasi kai ean o foititis exei analavei tin diplomatiki
$sqlCheck = "SELECT a.foititis, e.diplomatiki as ex_id FROM analamvanei a LEFT JOIN exetasi e ON e.diplomatiki = a.diplomatiki WHERE a.diplomatiki = ? LIMIT 1";
$stc = $conn->prepare($sqlCheck);
if (!$stc) { http_response_code(500); echo json_encode(['error'=>$conn->error]); exit; }
$stc->bind_param('i', $thesisId);
$stc->execute();
$rc = $stc->get_result();
$ck = $rc->fetch_assoc();
$stc->close();

if (empty($ck) || empty($ck['foititis']) || empty($ck['ex_id'])) {
    http_response_code(403);
    echo json_encode(['error'=>'Student has not completed presentation details / not assigned']);
    exit;
}

$sqlUp = "INSERT INTO announcements (diplomatiki_id, author, content) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE author = VALUES(author), content = VALUES(content), updated_at = CURRENT_TIMESTAMP";
$up = $conn->prepare($sqlUp);
if (!$up) { http_response_code(500); echo json_encode(['error'=>$conn->error]); exit; }
$author = $_SESSION['username'];
$up->bind_param('iss', $thesisId, $author, $content);
$ok = $up->execute();
$up->close();

if (!$ok) {
    http_response_code(500);
    echo json_encode(['error'=>'Failed to save announcement']);
    exit;
}

echo json_encode(['success'=>true]);
exit;
