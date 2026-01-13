<?php
session_start();
require_once 'database.php';
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');
header('Content-Type: application/json');

if (!isset($_SESSION['username'])) {
    echo json_encode([]);
    exit;
}

$professor = $_SESSION['username'];

$sql = "
    SELECT d.id, d.titlos
    FROM diplomatiki d
    JOIN analamvanei a ON d.id = a.diplomatiki
    WHERE d.epivlepontas = ?
      AND d.status_diplomatiki = 'Accepted'
      AND a.imerominia_enarxis <= DATE_SUB(NOW(), INTERVAL 2 YEAR)
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['error' => 'SQL prepare failed']);
    exit;
}

$stmt->bind_param("s", $professor);
$stmt->execute();
$result = $stmt->get_result();

$theses = [];
while ($row = $result->fetch_assoc()) {
    $theses[] = $row;
}

echo json_encode($theses);
?>
