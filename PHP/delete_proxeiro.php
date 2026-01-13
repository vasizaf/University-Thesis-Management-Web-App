<?php
session_start();
require_once 'database.php';
header('Content-Type: application/json');
require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

$username = $_SESSION['username'];

$sql = "SELECT diplomatiki FROM analamvanei WHERE foititis = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
$stmt->close();

if ($result->num_rows === 0) {
    echo json_encode(['error' => 'Δεν σας έχει ανατεθεί διπλωματική εργασία.']);
    exit;
}

$diplomatiki_id = $result->fetch_assoc()['diplomatiki'];

$sql = "SELECT proxeiro_keimeno FROM exetasi WHERE diplomatiki = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $diplomatiki_id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($row && !empty($row['proxeiro_keimeno']) && file_exists($row['proxeiro_keimeno'])) {
    unlink($row['proxeiro_keimeno']);
}

$sql = "UPDATE exetasi SET proxeiro_keimeno = NULL WHERE diplomatiki = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $diplomatiki_id);

if ($stmt->execute()) {
    echo json_encode(['success' => 'Το αρχείο διαγράφηκε επιτυχώς.']);
} else {
    echo json_encode(['error' => 'Σφάλμα κατά τη διαγραφή: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
