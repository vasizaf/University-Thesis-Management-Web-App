<?php
session_start();
include(__DIR__ . '/database.php'); 

header('Content-Type: application/json; charset=utf-8');

function json_err($msg) {
    echo json_encode(['success' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['username'])) {
    json_err('Not authenticated');
}
$sessionUser = $_SESSION['username'];

$thesisId = isset($_POST['thesisId']) ? intval($_POST['thesisId']) : 0;
$titlos = isset($_POST['titlos']) ? trim($_POST['titlos']) : '';
$perigrafi = isset($_POST['perigrafi']) ? trim($_POST['perigrafi']) : '';

if ($thesisId <= 0) json_err('Missing or invalid thesisId');

if (!isset($conn) || !($conn instanceof mysqli)) {
    json_err('Database connection not found');
}

$checkStmt = $conn->prepare("SELECT epivlepontas, status_diplomatiki, arxeio_perigrafis FROM diplomatiki WHERE id = ?");
if (!$checkStmt) json_err('DB prepare failed (select): ' . $conn->error);
$checkStmt->bind_param('i', $thesisId);
$checkStmt->execute();
$res = $checkStmt->get_result();
if (!$res) { $checkStmt->close(); json_err('DB read failed'); }
$row = $res->fetch_assoc();
$checkStmt->close();
if (!$row) json_err('Thesis not found');
if ($row['epivlepontas'] !== $sessionUser) json_err('Not authorized (not supervisor)');
if ($row['status_diplomatiki'] !== 'Does not meet requirements') json_err('Invalid thesis status');

$newFilename = null;
if (isset($_FILES['arxeio_perigrafis']) && is_array($_FILES['arxeio_perigrafis'])) {
    $f = $_FILES['arxeio_perigrafis'];
    if ($f['error'] === UPLOAD_ERR_OK) {
        $maxBytes = 10 * 1024 * 1024; // 10MB
        if ($f['size'] > $maxBytes) json_err('File too large (max 10MB)');

        $origName = $f['name'];
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if ($ext !== 'pdf') json_err('Only PDF files allowed (extension must be .pdf)');

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $f['tmp_name']);
        finfo_close($finfo);
        // allow application/pdf and application/octet-stream (some servers)
        if ($mime !== 'application/pdf' && $mime !== 'application/octet-stream') {
            //test
        }

        // ensure uploads dir exists (relative to this file)
        $uploadsDir = __DIR__ . '/../uploads';
        if (!is_dir($uploadsDir)) {
            if (!mkdir($uploadsDir, 0755, true)) json_err('Failed to create uploads directory');
        }

//to filename opos einai
        $origName = basename($origName); // strip path
        $sanitizedOrig = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $origName);
        $targetPath = $uploadsDir . DIRECTORY_SEPARATOR . $sanitizedOrig;

        if (!move_uploaded_file($f['tmp_name'], $targetPath)) {
            json_err('Failed to move uploaded file');
        }
        @chmod($targetPath, 0644);

        $newFilename = $sanitizedOrig;

    } else {
        if ($f['error'] !== UPLOAD_ERR_NO_FILE) {
            json_err('File upload error code: ' . $f['error']);
        }
    }
}

$status_required = 'Does not meet requirements';
if ($newFilename !== null) {
    $stmt = $conn->prepare("UPDATE diplomatiki SET titlos = ?, perigrafi = ?, arxeio_perigrafis = ? WHERE id = ? AND epivlepontas = ? AND status_diplomatiki = ?");
    if (!$stmt) json_err('DB prepare failed (update with file): ' . $conn->error);
    // types: s (titlos), s (perigrafi), s (filename), i (id), s (epivlepontas), s (status)
    $stmt->bind_param('sssiss', $titlos, $perigrafi, $newFilename, $thesisId, $sessionUser, $status_required);
} else {
    $stmt = $conn->prepare("UPDATE diplomatiki SET titlos = ?, perigrafi = ? WHERE id = ? AND epivlepontas = ? AND status_diplomatiki = ?");
    if (!$stmt) json_err('DB prepare failed (update without file): ' . $conn->error);
    // types: s (titlos), s (perigrafi), i (id), s (epivlepontas), s (status)
    $stmt->bind_param('ssiss', $titlos, $perigrafi, $thesisId, $sessionUser, $status_required);
}

if (!$stmt->execute()) {
    $err = $stmt->error;
    $stmt->close();
    json_err('DB update failed: ' . $err);
}
$affected = $stmt->affected_rows;
$stmt->close();

// success (even if $affected === 0, treat as success; client-side will update UI)
echo json_encode(['success' => true, 'newFilename' => $newFilename], JSON_UNESCAPED_UNICODE);
exit;
