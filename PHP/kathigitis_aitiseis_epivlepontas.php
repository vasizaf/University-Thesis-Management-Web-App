<?php
header('Content-Type: application/json; charset=utf-8');

session_start();

$dbPath = __DIR__ . '/database.php';
if (!file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode(['error' => "Missing database.php at $dbPath"]);
    exit;
}
require_once $dbPath;  // expects $conn to be set

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection not available']);
    exit;
}

$supervisor = $_SESSION['username'];

//diplomatikes pou einai epivlepontas
$appSql = "
  SELECT 
    a.katastasi,
    a.foititis,
    f.onoma   AS foititis_onoma,
    f.eponimo AS foititis_eponimo,
    a.kathigitis,
    k.onoma   AS kath_onoma,
    k.eponimo AS kath_eponimo,
    a.diplomatiki,
    a.imerominia_prosklisis,
    a.imerominia_apantisis
  FROM aitisi a
  JOIN diplomatiki d  ON a.diplomatiki = d.id
  JOIN foititis f     ON f.username  = a.foititis
  JOIN kathigitis k   ON k.username  = a.kathigitis
  WHERE d.epivlepontas = ?
";
$stmt = $conn->prepare($appSql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'DB prepare failed: ' . $conn->error]);
    exit;
}
$stmt->bind_param('s', $supervisor);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['error' => 'DB execute failed: ' . $stmt->error]);
    exit;
}
$result = $stmt->get_result();
$applications = [];
while ($row = $result->fetch_assoc()) {
    // trim datetime to date
    if (!empty($row['imerominia_prosklisis'])) {
        $row['imerominia_prosklisis'] = substr($row['imerominia_prosklisis'], 0, 10);
    }
    if (!empty($row['imerominia_apantisis'])) {
        $row['imerominia_apantisis'] = substr($row['imerominia_apantisis'], 0, 10);
    }
    $applications[] = $row;
}
$stmt->close();

//full name
$nameSql = "SELECT onoma, eponimo FROM kathigitis WHERE username = ?";
$supStmt = $conn->prepare($nameSql);
if ($supStmt) {
    $supStmt->bind_param('s', $supervisor);
    $supStmt->execute();
    $supRes = $supStmt->get_result();
    $supRow = $supRes->fetch_assoc();
    $supStmt->close();
}
$supervisorName = isset($supRow['onoma'], $supRow['eponimo'])
    ? trim($supRow['onoma'] . ' ' . $supRow['eponimo'])
    : $supervisor;

$conn->close();

echo json_encode([
    'success'        => true,
    'supervisorName' => $supervisorName,
    'count'          => count($applications),
    'applications'   => $applications
]);
exit;
