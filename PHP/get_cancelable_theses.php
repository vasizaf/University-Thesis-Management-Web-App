<?php
session_start();
require_once 'database.php';
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if (!isset($_SESSION['username'])) {
    echo json_encode([]);
    exit;
}

$professor = $_SESSION['username'];

if (!$conn) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$sql = "
    SELECT d.id, d.titlos
    FROM diplomatiki d
    JOIN analamvanei a ON d.id = a.diplomatiki
    WHERE d.status_diplomatiki = 'Does not meet requirements'
      AND d.epivlepontas = ?
      AND a.foititis IS NOT NULL
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