<?php
session_start();
include('database.php');
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

if (!isset($_SESSION['logged_in'], $_SESSION['role'], $_SESSION['username']) || $_SESSION['role'] !== 'kathigitis') {
    echo json_encode(['error' => 'Not authorized']);
    exit;
}

$titlos = $_POST['titlos'] ?? '';
$perigrafi = $_POST['perigrafi'] ?? '';
$simeiosis = $_POST['simeiosis'] ?? null;
$epivlepontas = $_SESSION['username']; // logged-in professor
$arxeio = $_FILES['arxeio_perigrafis']['name'] ?? null;

//anevazei ta uploads ston fakelo tou uploads/proxeira
if (isset($_FILES['arxeio_perigrafis']) && $_FILES['arxeio_perigrafis']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '../../uploads/proxeira/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileName = basename($_FILES['arxeio_perigrafis']['name']);
    $tmpPath  = $_FILES['arxeio_perigrafis']['tmp_name'];
    $target   = $uploadDir . $fileName;

    if (move_uploaded_file($tmpPath, $target)) {
        $arxeio_perigrafis = $fileName; //apothikeuetai stin vasi
    } else {
        echo json_encode(['error' => 'File upload failed. Check permissions on /uploads/']);
        exit;
    }
} else {
    $arxeio_perigrafis = null;
}


if (!$titlos || !$perigrafi) {
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$sql = "INSERT INTO diplomatiki (titlos, perigrafi, arxeio_perigrafis, simeiosis, epivlepontas)
        VALUES (?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sssss", $titlos, $perigrafi, $arxeio, $simeiosis, $epivlepontas);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'id' => $stmt->insert_id]);
} else {
    echo json_encode(['error' => $stmt->error]);
}
$stmt->close();
$conn->close();
?>
