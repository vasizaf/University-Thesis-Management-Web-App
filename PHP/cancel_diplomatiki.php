<?php

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

session_start();
require_once 'database.php';          
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

header('Content-Type: application/json; charset=utf-8');

$DEBUG = false;

function send_json($payload, $http_status = 200) {
    http_response_code($http_status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_SESSION['username'])) {
    send_json(['error' => 'Not authenticated'], 401);
}

$professor   = $_SESSION['username'];
$thesisIdRaw = $_POST['thesis_id'] ?? null;
$arithmos_gs = isset($_POST['arithmos_gs']) ? trim($_POST['arithmos_gs']) : null;
$year        = isset($_POST['year']) ? trim($_POST['year']) : null;

if (!$thesisIdRaw || !$arithmos_gs || !$year) {
    send_json(['error' => 'Missing required input (thesis_id, arithmos_gs, year)'], 400);
}

$thesisId = intval($thesisIdRaw);
if ($thesisId <= 0) send_json(['error' => 'Invalid thesis_id'], 400);

if (!isset($conn) || !($conn instanceof mysqli)) {
    error_log('cancel_diplomatiki: $conn is not a mysqli instance');
    send_json(['error' => 'Server configuration error'], 500);
}

try {
    if (!$conn->begin_transaction()) {
        throw new Exception('Failed to start transaction: ' . $conn->error);
    }

    //checkarei an einai o epivlepontas
    $verifySql = "SELECT id, titlos, epivlepontas FROM diplomatiki WHERE id = ? AND epivlepontas = ? LIMIT 1";
    $verifyStmt = $conn->prepare($verifySql);
    if (!$verifyStmt) throw new Exception('Prepare failed (verify): ' . $conn->error);
    $verifyStmt->bind_param("is", $thesisId, $professor);
    if (!$verifyStmt->execute()) throw new Exception('Execute failed (verify): ' . $verifyStmt->error);
    $verifyStmt->bind_result($v_id, $v_titlos, $v_epivlepontas);
    if (!$verifyStmt->fetch()) {
        $verifyStmt->close();
        $conn->rollback();
        send_json(['error' => 'Unauthorized or thesis not found'], 403);
    }
    $verifyStmt->close();

    $titlos = $v_titlos ?? '';
    $kathigitis = $v_epivlepontas ?? $professor;

    //deixnei kai tous foitites ean iparxoun
    $foititis = null;
    $foititisSql = "SELECT foititis FROM analamvanei WHERE diplomatiki = ? LIMIT 1";
    $fs = $conn->prepare($foititisSql);
    if (!$fs) throw new Exception('Prepare failed (foititis): ' . $conn->error);
    $fs->bind_param("i", $thesisId);
    if (!$fs->execute()) throw new Exception('Execute failed (foititis): ' . $fs->error);
    $fs->bind_result($r_foititis);
    if ($fs->fetch()) $foititis = $r_foititis;
    $fs->close();

    //update tin diplomatiki meta to cancel
    $updateSql = "UPDATE diplomatiki 
                  SET status_diplomatiki = 'Does not meet requirements',
                      noumero1 = NULL,
                      noumero2 = NULL,
                      simeioseis_epivlepontas = NULL,
                      simeioseis_noumero1 = NULL,
                      simeioseis_noumero2 = NULL
                  WHERE id = ?";
    $u = $conn->prepare($updateSql);
    if (!$u) throw new Exception('Prepare failed (update): ' . $conn->error);
    $u->bind_param("i", $thesisId);
    if (!$u->execute()) throw new Exception('Execute failed (update): ' . $u->error);
    $u->close();

    //svinei kai to analamvanei
    $delSql = "DELETE FROM analamvanei WHERE diplomatiki = ?";
    $d = $conn->prepare($delSql);
    if (!$d) throw new Exception('Prepare failed (delete analamvanei): ' . $conn->error);
    $d->bind_param("i", $thesisId);
    if (!$d->execute()) throw new Exception('Execute failed (delete analamvanei): ' . $d->error);
    $d->close();

    // kai kanoume insert sto table canceled_theses
    $insertSql = "INSERT INTO canceled_theses
        (diplomatiki_id, titlos, foititis, kathigitis, arithmos_gs, etos, apologia)
        VALUES (?, ?, ?, ?, ?, ?, 'Από Διδάσκοντα')";
    $ins = $conn->prepare($insertSql);
    if (!$ins) throw new Exception('Prepare failed (insert): ' . $conn->error);

    $foititis_s = ($foititis === null) ? '' : (string)$foititis; // <-- empty string if null
    $arithmos_gs_i = intval($arithmos_gs);
    $year_i = intval($year);
    if ($year_i < 2020 || $year_i > 2025) {
    send_json(['error' => 'Invalid year — must be between 2020 and 2025'], 400);
}

    //i gia integer kai s gia string
    if (!$ins->bind_param("isssii", $thesisId, $titlos, $foititis_s, $kathigitis, $arithmos_gs_i, $year_i)) {
        throw new Exception('bind_param failed (insert): ' . $ins->error);
    }
    if (!$ins->execute()) throw new Exception('Execute failed (insert): ' . $ins->error);
    $ins->close();

    if (!$conn->commit()) throw new Exception('Commit failed: ' . $conn->error);

    send_json(['success' => true, 'message' => 'Thesis canceled and logged into canceled_theses'], 200);

} catch (Exception $e) {
    @ $conn->rollback();
    error_log('cancel_diplomatiki exception: ' . $e->getMessage() . ' // mysqli_error: ' . ($conn->error ?? ''));
    if ($DEBUG) send_json(['error' => 'Failed to cancel thesis: ' . $e->getMessage()], 500);
    send_json(['error' => 'Failed to cancel thesis (see server logs)'], 500);
}
