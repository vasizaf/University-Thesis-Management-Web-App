<?php
session_start();
include('database.php');
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

header('Content-Type: application/json; charset=utf-8');

//to afinoume kalou kakou
if (!isset($_SESSION['logged_in'], $_SESSION['role'], $_SESSION['username']) || $_SESSION['role'] !== 'kathigitis') {
    http_response_code(401);
    echo json_encode(['error' => 'Not authorized']);
    exit;
}

$professor = $_SESSION['username'];

//diplomatikes tou epivleponta
$sql = "SELECT diplomatiki_id, titlos, foititis, kathigitis, arithmos_gs, etos, apologia
        FROM canceled_theses
        WHERE kathigitis = ?
        ORDER BY diplomatiki_id DESC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'DB prepare failed']);
    exit;
}
$stmt->bind_param('s', $professor);
$stmt->execute();
$res = $stmt->get_result();
$canceled = $res->fetch_all(MYSQLI_ASSOC);
$stmt->close();
$conn->close();

echo json_encode(['count' => count($canceled), 'canceled' => $canceled]);
exit;
