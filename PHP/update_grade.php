<?php
session_start();
include('database.php');

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$professor = $_SESSION['username'];

$thesisId = isset($_POST['thesisId']) ? intval($_POST['thesisId']) : 0;
$gradeField = isset($_POST['gradeField']) ? trim($_POST['gradeField']) : '';
$gradeRaw = isset($_POST['grade']) ? trim($_POST['grade']) : '';

if (!$thesisId || !$gradeField) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing parameters']);
    exit;
}

if (!preg_match('/^(epivlepontas|noumero1|noumero2)_grade([1-4])$/', $gradeField, $m)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid gradeField']);
    exit;
}
$graderRole = $m[1];
$gradeIndex = intval($m[2]); // 1..4

if ($gradeRaw === '') {
    $gradeVal = ''; // will be converted to NULL by SQL NULLIF(?, '')
} else {
    $gradeVal = str_replace(',', '.', $gradeRaw);
    if (!is_numeric($gradeVal)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid grade value']);
        exit;
    }
}

$sql = "SELECT id, status_diplomatiki, switch, epivlepontas, noumero1, noumero2 FROM diplomatiki WHERE id = ? LIMIT 1";
$stmt = $conn->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['error'=>'DB prepare failed']); exit; }
$stmt->bind_param('i', $thesisId);
$stmt->execute();
$res = $stmt->get_result();
$thesis = $res->fetch_assoc();
$stmt->close();

if (!$thesis) { http_response_code(404); echo json_encode(['error'=>'Thesis not found']); exit; }

//mono otan einai Under Exam kai to Switch einai on
if ($thesis['status_diplomatiki'] !== 'Under exam' || (string)$thesis['switch'] !== 'True') {
    http_response_code(403);
    echo json_encode(['error' => 'Grades may be edited only while thesis is Under exam and switch is On']);
    exit;
}

//o loggedInUser allazei MONO tous vathmous tou
$allowed = false;
if ($graderRole === 'epivlepontas' && $thesis['epivlepontas'] === $professor) $allowed = true;
if ($graderRole === 'noumero1' && $thesis['noumero1'] === $professor) $allowed = true;
if ($graderRole === 'noumero2' && $thesis['noumero2'] === $professor) $allowed = true;

if (!$allowed) {
    http_response_code(403);
    echo json_encode(['error' => 'You are not authorized to edit this grade']);
    exit;
}


$g1 = $g2 = $g3 = $g4 = '';
switch ($gradeIndex) {
    case 1: $g1 = $gradeVal; break;
    case 2: $g2 = $gradeVal; break;
    case 3: $g3 = $gradeVal; break;
    case 4: $g4 = $gradeVal; break;
}

//insert i update
$sql = "INSERT INTO diplomatiki_grades (diplomatiki_id, grader_role, grader_username, grade1, grade2, grade3, grade4)
        VALUES (?, ?, ?, NULLIF(?,''), NULLIF(?,''), NULLIF(?,''), NULLIF(?,'')) 
        ON DUPLICATE KEY UPDATE grader_username = VALUES(grader_username), grade{$gradeIndex} = VALUES(grade{$gradeIndex}), updated_at = CURRENT_TIMESTAMP";

$stmt = $conn->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['error'=>'DB prepare failed (insert)']); exit; }

//i = integer , s = string
$stmt->bind_param('issssss', $thesisId, $graderRole, $professor, $g1, $g2, $g3, $g4);

$ok = $stmt->execute();
if (!$ok) {
    http_response_code(500);
    echo json_encode(['error' => 'DB execute failed: ' . $stmt->error]);
    $stmt->close();
    exit;
}

$stmt->close();

//epistrefei to saved value gia na MIN xreiastei update
$q = "SELECT grade1, grade2, grade3, grade4 FROM diplomatiki_grades WHERE diplomatiki_id = ? AND grader_role = ? LIMIT 1";
$qstmt = $conn->prepare($q);
$qstmt->bind_param('is', $thesisId, $graderRole);
$qstmt->execute();
$qres = $qstmt->get_result();
$row = $qres->fetch_assoc();
$qstmt->close();

// normalize output
echo json_encode(['success' => true, 'grades' => $row]);
exit;
