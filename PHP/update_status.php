<?php
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once 'database.php';

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$professor = $_SESSION['username'];
$thesisId = isset($_POST['thesisId']) ? trim($_POST['thesisId']) : '';
$newStatus = isset($_POST['status']) ? trim($_POST['status']) : '';

if (!$thesisId || $newStatus === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing parameters']);
    exit;
}

$allowed = ['Pending', 'Accepted', 'Rejected'];
if (!in_array($newStatus, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid status']);
    exit;
}

//check ean einai o sostos kathigitis
$stmt = $conn->prepare("SELECT kathigitis FROM aitisi WHERE diplomatiki = ?");
$stmt->bind_param('s', $thesisId);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Thesis not found']);
    exit;
}

//update
$upd = $conn->prepare(
    "UPDATE aitisi 
     SET katastasi = ?, imerominia_apantisis = CURRENT_DATE 
     WHERE diplomatiki = ? AND kathigitis = ? AND katastasi = 'Pending'"
);

$upd->bind_param('sis', $newStatus, $thesisId, $professor);
if (!$upd->execute()) {
    http_response_code(500);
    echo json_encode(['error' => 'Update failed: ' . $upd->error]);
    exit;
}
$upd->close();

//ean to status einai accepted tote check ean o foititis exei 2 accepted
if ($newStatus === 'Accepted') {
    $stmt = $conn->prepare("SELECT foititis FROM aitisi WHERE diplomatiki = ?");
    $stmt->bind_param("s", $thesisId);
    $stmt->execute();
    $stmt->bind_result($studentUsername);
    $stmt->fetch();
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT COUNT(*) 
        FROM aitisi 
        WHERE foititis = ? AND katastasi = 'Accepted'
    ");
    $stmt->bind_param("s", $studentUsername);
    $stmt->execute();
    $stmt->bind_result($acceptedCount);
    $stmt->fetch();
    $stmt->close();

    //SIMANTIKO: ean exei 2 accepted tote oles oi ipoloipes aitiseis ginontai rejected
    if ($acceptedCount >= 2) {
    // Reject all remaining pending applications
    $stmt = $conn->prepare("
        UPDATE aitisi
        SET katastasi = 'Rejected'
        WHERE foititis = ? AND katastasi = 'Pending'
    ");
    $stmt->bind_param("s", $studentUsername);
    $stmt->execute();
    $stmt->close();

    //update to status kai tin imerominia
    $stmt = $conn->prepare("
        UPDATE diplomatiki 
        SET status_diplomatiki = 'Accepted' 
        WHERE id = ?
    ");
    $stmt->bind_param("i", $thesisId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare("
        UPDATE analamvanei 
        SET imerominia_enarxis = CURRENT_TIMESTAMP 
        WHERE foititis = ? AND diplomatiki = ?
    ");
    $stmt->bind_param("si", $studentUsername, $thesisId);
    $stmt->execute();
    $stmt->close();
    }

    //o kathigitis einai pleon noumero1 i noumero2
    $stmt = $conn->prepare("SELECT noumero1, noumero2 FROM diplomatiki WHERE id = ?");
    $stmt->bind_param("i", $thesisId);
    $stmt->execute();
    $result = $stmt->get_result();
    $committee = $result->fetch_assoc();
    $stmt->close();

    if (!$committee['noumero1']) {
        $stmt = $conn->prepare("UPDATE diplomatiki SET noumero1 = ? WHERE id = ?");
        $stmt->bind_param("si", $professor, $thesisId);
        $stmt->execute();
        $stmt->close();
    } elseif (!$committee['noumero2']) {
        $stmt = $conn->prepare("UPDATE diplomatiki SET noumero2 = ? WHERE id = ?");
        $stmt->bind_param("si", $professor, $thesisId);
        $stmt->execute();
        $stmt->close();
    }
}

$conn->close();

echo json_encode(['success' => true]);
exit;
