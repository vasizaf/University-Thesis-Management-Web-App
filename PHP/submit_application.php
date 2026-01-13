<?php
session_start();
header('Content-Type: application/json');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

include 'database.php';

$body = json_decode(file_get_contents('php://input'), true);
if (
    ! is_array($body)
    || empty($body['professor'])
    || empty($body['thesisId'])
) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$student   = $_SESSION['username'];
$professor = $conn->real_escape_string($body['professor']);
$thesisId  = (int) $body['thesisId'];
$status    = 'Pending';

//check poses aitiseis exei o foititis
$stmt = $conn->prepare("
    SELECT COUNT(*) 
    FROM aitisi 
    WHERE foititis = ? AND katastasi = 'Accepted'
");
$stmt->bind_param("s", $student);
$stmt->execute();
$stmt->bind_result($acceptedCountBefore);
$stmt->fetch();
$stmt->close();

if ($acceptedCountBefore >= 2) {
    http_response_code(403);
    echo json_encode(['error' => 'Έχετε ήδη δύο αποδεκτές αιτήσεις. Δεν μπορείτε να υποβάλετε άλλη.']);
    exit;
}

//check posa pending
$stmt = $conn->prepare("
    SELECT COUNT(*) 
    FROM aitisi 
    WHERE foititis = ? AND katastasi = 'Pending'
");
$stmt->bind_param("s", $student);
$stmt->execute();
$stmt->bind_result($pendingCount);
$stmt->fetch();
$stmt->close();

if ($pendingCount >= 2) {
    http_response_code(403);
    echo json_encode(['error' => 'Έχετε ήδη υποβάλει δύο εκκρεμείς αιτήσεις. Περιμένετε πριν στείλετε άλλη.']);
    exit;
}

$stmt = $conn->prepare("
    INSERT INTO aitisi
      (katastasi, foititis, kathigitis, diplomatiki)
    VALUES (?, ?, ?, ?)
");
$stmt->bind_param(
    "sssi",
    $status,
    $student,
    $professor,
    $thesisId
);

if (! $stmt->execute()) {
    http_response_code(500);
    echo json_encode(['error' => $stmt->error]);
    exit;
}
$stmt->close();

//to onoma tou kathigiti
$stmt = $conn->prepare("
    SELECT onoma, eponimo
    FROM kathigitis
    WHERE username = ?
");
$stmt->bind_param("s", $professor);
$stmt->execute();
$stmt->bind_result($onoma, $eponimo);
$profName = $stmt->fetch()
    ? "{$onoma} {$eponimo}"
    : $professor;
$stmt->close();

//check pali poses aitiseis exei accepted
$stmt = $conn->prepare("
    SELECT COUNT(*) 
    FROM aitisi 
    WHERE foititis = ? AND katastasi = 'Accepted'
");
$stmt->bind_param("s", $student);
$stmt->execute();
$stmt->bind_result($acceptedCountAfter);
$stmt->fetch();
$stmt->close();

$conn->close();

echo json_encode([
    'professorName' => $profName,
    'status'        => $status,
    'answer'        => ''
]);
exit;
?>
