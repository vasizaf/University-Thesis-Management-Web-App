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

try {
    //pairnei tis plirofories apo to analamvanei
    $sql = "SELECT a.foititis, d.epivlepontas, d.titlos
            FROM analamvanei a
            JOIN diplomatiki d ON d.id = a.diplomatiki
            WHERE a.diplomatiki = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception($conn->error);
    $stmt->bind_param('i', $thesisId);
    $stmt->execute();
    $res = $stmt->get_result();
    $assign = $res->fetch_assoc();
    $stmt->close();

    //kai tin exetasi
    $sql2 = "SELECT tropos_exetasis, aithousa, link, imerominia, ora, proxeiro_keimeno FROM exetasi WHERE diplomatiki = ? LIMIT 1";
    $stmt2 = $conn->prepare($sql2);
    if (!$stmt2) throw new Exception($conn->error);
    $stmt2->bind_param('i', $thesisId);
    $stmt2->execute();
    $res2 = $stmt2->get_result();
    $exetasi = $res2->fetch_assoc();
    $stmt2->close();

    //kai ean iparxei announcement
    $sql3 = "SELECT id, author, content, created_at, updated_at FROM announcements WHERE diplomatiki_id = ? LIMIT 1";
    $stmt3 = $conn->prepare($sql3);
    if (!$stmt3) throw new Exception($conn->error);
    $stmt3->bind_param('i', $thesisId);
    $stmt3->execute();
    $res3 = $stmt3->get_result();
    $ann = $res3->fetch_assoc();
    $stmt3->close();

    //ta xtizei
    $student = $assign['foititis'] ?? null;
    $epivlepontas = $assign['epivlepontas'] ?? null;
    $user = $_SESSION['username'];
    $isSupervisor = ($user === $epivlepontas);

    $allowed = ($student !== null && $exetasi !== null);

    echo json_encode([
        'allowed' => $allowed,
        'student' => $student,
        'isSupervisor' => (bool)$isSupervisor,
        'exetasi' => $exetasi ?: null,
        'announcement' => $ann ?: null
    ]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Server error','message'=>$e->getMessage()]);
    exit;
}
