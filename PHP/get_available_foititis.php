<?php
ini_set('display_errors', '0');
error_reporting(0);
ob_start();

session_start();
require_once __DIR__ . '/database.php';      // defines $conn
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

header('Content-Type: application/json');

//json kai http
function json_exit(array $data, int $httpCode = 200): void {
    http_response_code($httpCode);
    ob_clean();
    echo json_encode($data);
    exit;
}


if (!isset($_SESSION['username'])) {
    json_exit([], 403);
}

//oi foitites xoris diplomatiki
$sql  = "
    SELECT username, onoma, eponimo
      FROM foititis
     WHERE username NOT IN (SELECT foititis FROM analamvanei)
";
$stmt = $conn->prepare($sql);
$stmt->execute();
$result = $stmt->get_result();

$students = [];
while ($row = $result->fetch_assoc()) {
    $students[] = $row;
}

$stmt->close();
$conn->close();

//epistrefei tous foitites
json_exit($students);