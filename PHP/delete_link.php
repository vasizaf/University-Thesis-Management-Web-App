<?php
session_start();
require_once 'database.php';
require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');
header('Content-Type: application/json');


//json input
$data = json_decode(file_get_contents("php://input"), true);
$link_number = $data['link_number'] ?? null;

if (!$link_number) {
    echo json_encode(['error' => 'Δεν δόθηκε σύνδεσμος προς διαγραφή.']);
    exit;
}

//svinei to link
$sql = "DELETE FROM links WHERE link_number = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $link_number);

if ($stmt->execute()) {
    echo json_encode(['success' => 'Ο σύνδεσμος διαγράφηκε επιτυχώς.']);
} else {
    echo json_encode(['error' => 'Σφάλμα βάσης δεδομένων κατά τη διαγραφή.']);
}

$stmt->close();
$conn->close();
