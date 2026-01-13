<?php
session_start();
include 'database.php';

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$username = $_SESSION['username'];

//oles oi diplomatikes pou o kathigitis epivlepei
$sql = "
  SELECT 
    a.katastasi,
    a.foititis,
    f.onoma       AS foititis_onoma,
    f.eponimo     AS foititis_eponimo,
    a.diplomatiki,
    a.imerominia_prosklisis,
    a.imerominia_apantisis,
    d.epivlepontas,
    sup.onoma     AS epiv_onoma,
    sup.eponimo   AS epiv_eponimo
  FROM aitisi a
  JOIN diplomatiki d  ON a.diplomatiki = d.id
  JOIN kathigitis sup ON d.epivlepontas = sup.username
  JOIN foititis f     ON f.username      = a.foititis
  WHERE a.kathigitis = ?
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database prepare failed']);
    exit;
}

$stmt->bind_param('s', $username);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database execute failed']);
    exit;
}

$result = $stmt->get_result();
$applications = [];

while ($row = $result->fetch_assoc()) {
    // Trim timestamp to YYYY-MM-DD
    if (!empty($row['imerominia_prosklisis'])) {
        $row['imerominia_prosklisis'] = substr($row['imerominia_prosklisis'], 0, 10);
    }
    if (!empty($row['imerominia_apantisis'])) {
        $row['imerominia_apantisis'] = substr($row['imerominia_apantisis'], 0, 10);
    }
    $applications[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode([
    'success'      => true,
    'count'        => count($applications),
    'applications' => $applications
]);
exit;
