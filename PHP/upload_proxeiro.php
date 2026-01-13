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

$uploadDir = '../uploads/proxeira/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

if (isset($_FILES['proxeiro_keimeno']) && $_FILES['proxeiro_keimeno']['error'] === UPLOAD_ERR_OK) {
    $tmpName = $_FILES['proxeiro_keimeno']['tmp_name'];
    $originalName = basename($_FILES['proxeiro_keimeno']['name']);
    $safeName = time() . '_' . preg_replace("/[^a-zA-Z0-9.\-_]/", "", $originalName);
    $filePath = $uploadDir . $safeName;

    if (!move_uploaded_file($tmpName, $filePath)) {
        echo json_encode(['error' => 'Αποτυχία μεταφοράς αρχείου.']);
        exit;
    }

//check ean iparxei to arxeio
    $sql = "SELECT proxeiro_keimeno FROM exetasi WHERE diplomatiki = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $diplomatiki_id);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    //delete to palio ean iparxei neo
    if ($existing && !empty($existing['proxeiro_keimeno']) && file_exists($existing['proxeiro_keimeno'])) {
        unlink($existing['proxeiro_keimeno']);
    }

    //neo file path
    if ($existing) {
        $sql = "UPDATE exetasi SET proxeiro_keimeno = ? WHERE diplomatiki = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $filePath, $diplomatiki_id);
    } else {
        $sql = "INSERT INTO exetasi (diplomatiki, proxeiro_keimeno) VALUES (?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("is", $diplomatiki_id, $filePath);
    }

    if ($stmt->execute()) {
        echo json_encode([
            'success' => 'Το αρχείο αντικαταστάθηκε επιτυχώς!',
            'filename' => $filePath,
            'original' => $originalName
        ]);
    } else {
        echo json_encode(['error' => 'Σφάλμα βάσης δεδομένων: ' . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(['error' => 'Δεν επιλέχθηκε αρχείο ή υπήρξε σφάλμα.']);
}

$conn->close();
?>