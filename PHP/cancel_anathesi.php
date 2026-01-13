<?php
session_start();
header('Content-Type: application/json');
require_once 'database.php';
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

if (!isset($_SESSION['username'])) {
    echo json_encode(['success' => false, 'error' => 'Not logged in']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$thesisId = $data['thesisId'] ?? null;

if (!$thesisId) {
    echo json_encode(['success' => false, 'error' => 'Missing thesis ID']);
    exit;
}

//checkarei ean o kathigitis exei tin diplomatiki
$sqlCheck = "SELECT id FROM diplomatiki WHERE id = ? AND epivlepontas = ?";
$stmtCheck = $conn->prepare($sqlCheck);
$stmtCheck->bind_param("is", $thesisId, $_SESSION['username']);
$stmtCheck->execute();
$resultCheck = $stmtCheck->get_result();

if ($resultCheck->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'Unauthorized or thesis not found']);
    exit;
}

//svinei tin aitisi
$sqlAitisi = "DELETE FROM aitisi WHERE diplomatiki = ?";
$stmtAitisi = $conn->prepare($sqlAitisi);
$stmtAitisi->bind_param("i", $thesisId);
$stmtAitisi->execute();

//svinei kai ta stoixeia apo to analamvanei
$sqlAnalamvanei = "DELETE FROM analamvanei WHERE diplomatiki = ?";
$stmtAnalamvanei = $conn->prepare($sqlAnalamvanei);
$stmtAnalamvanei->bind_param("i", $thesisId);
$stmtAnalamvanei->execute();

//akironei kai tous allous kathigites
$sqlUpdateDiploma = "UPDATE diplomatiki 
                     SET noumero1 = NULL, noumero2 = NULL 
                     WHERE id = ? AND (noumero1 IS NOT NULL OR noumero2 IS NOT NULL)";
$stmtUpdate = $conn->prepare($sqlUpdateDiploma);
$stmtUpdate->bind_param("i", $thesisId);
$stmtUpdate->execute();

echo json_encode(['success' => true]);
?>
