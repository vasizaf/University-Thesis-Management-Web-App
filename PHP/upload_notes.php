<?php
session_start();
include('database.php');

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$professor = $_SESSION['username'];

$allowed_fields = [
    'simeioseis_epivlepontas',
    'simeioseis_noumero1',
    'simeioseis_noumero2'
];

$thesisId = isset($_POST['thesisId']) ? intval($_POST['thesisId']) : null;
$field = isset($_POST['field']) ? trim($_POST['field']) : null;

if (!$thesisId || !$field || !in_array($field, $allowed_fields, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid parameters']);
    exit;
}

if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

//check ean to arxeio exei sigkekrimeno megethos
$maxBytes = 5 * 1024 * 1024; // 5 MB
if ($_FILES['file']['size'] > $maxBytes) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large (max 5 MB)']);
    exit;
}

// ta allowed eidi arxeion
$allowed_mimes = [
    'application/pdf' => 'pdf',
    'application/msword' => 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
    'text/plain' => 'txt',
    'image/png' => 'png',
    'image/jpeg' => 'jpg'
];

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($_FILES['file']['tmp_name']);
$ext = isset($allowed_mimes[$mime]) ? $allowed_mimes[$mime] : null;

if (!$ext) {
    http_response_code(400);
    echo json_encode(['error' => 'Unsupported file type. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG']);
    exit;
}

$sql = "SELECT id, status_diplomatiki, epivlepontas, noumero1, noumero2, {$field} AS existing_note FROM diplomatiki WHERE id = ? LIMIT 1";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'DB prepare failed']);
    exit;
}
$stmt->bind_param('i', $thesisId);
$stmt->execute();
$res = $stmt->get_result();
$thesis = $res->fetch_assoc();
$stmt->close();

if (!$thesis) {
    http_response_code(404);
    echo json_encode(['error' => 'Thesis not found']);
    exit;
}

// only allow when status is exactly 'Accepted'
if ($thesis['status_diplomatiki'] !== 'Accepted') {
    http_response_code(403);
    echo json_encode(['error' => 'Notes can only be uploaded when thesis status is Accepted']);
    exit;
}

//check ean einai o kathigitis logged in kai san ti einai logged oste na paei sto sosto collumn
$allowed_for_user = false;
if ($field === 'simeioseis_epivlepontas' && $thesis['epivlepontas'] === $professor) $allowed_for_user = true;
if ($field === 'simeioseis_noumero1' && $thesis['noumero1'] === $professor) $allowed_for_user = true;
if ($field === 'simeioseis_noumero2' && $thesis['noumero2'] === $professor) $allowed_for_user = true;

if (!$allowed_for_user) {
    http_response_code(403);
    echo json_encode(['error' => 'You are not authorized to upload notes for this thesis/field']);
    exit;
}

$uploadBase = __DIR__ . '/../uploads/notes/';
if (!is_dir($uploadBase)) {
    if (!mkdir($uploadBase, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create upload directory']);
        exit;
    }
}

//kratame to onoma tou arxeiou
$origName = $_FILES['file']['name'] ?? 'upload';

$origBase = pathinfo($origName, PATHINFO_FILENAME);

//sigkekrimenoi characters sto arxeio
$sanitizedBase = preg_replace('/[^A-Za-z0-9 _.-]+/', '_', $origBase);
$sanitizedBase = trim($sanitizedBase, " _.-");

if (mb_strlen($sanitizedBase) > 80) {
    $sanitizedBase = mb_substr($sanitizedBase, 0, 80);
}

//to arxeio tha exei to thesisid, field kai to original onoma gia na diakrinoume diafores
$filename = sprintf('thesis%d_%s_%s.%s',
    $thesisId,
    $field,
    $sanitizedBase ?: 'file',
    $ext
);

$targetPath = $uploadBase . $filename;



if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move uploaded file']);
    exit;
}

if (!empty($thesis['existing_note'])) {
    $oldPath = $uploadBase . $thesis['existing_note'];
    if (is_file($oldPath)) {
        @unlink($oldPath);
    }
}

$updateSql = "UPDATE diplomatiki SET {$field} = ? WHERE id = ?";
$uStmt = $conn->prepare($updateSql);
if (!$uStmt) {
    @unlink($targetPath);
    http_response_code(500);
    echo json_encode(['error' => 'DB prepare failed (update)']);
    exit;
}
$uStmt->bind_param('si', $filename, $thesisId);
$ok = $uStmt->execute();
$uStmt->close();

if (!$ok) {
    @unlink($targetPath);
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save filename in DB']);
    exit;
}

// success
echo json_encode(['success' => true, 'filename' => $filename]);
exit;
