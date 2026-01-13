<?php
session_start();
require_once 'database.php';
header('Content-Type: application/json');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

$username = $_SESSION['username'];

//stoixeia tis diplomatikis
$sql = "SELECT diplomatiki FROM analamvanei WHERE foititis = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['error' => 'Δεν σας έχει ανατεθεί διπλωματική εργασία.']);
    exit;
}

$diplomatiki_id = $result->fetch_assoc()['diplomatiki'];
$stmt->close();

//checkarei ean iparxei idi exetasi
$sql = "SELECT * FROM exetasi WHERE diplomatiki = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $diplomatiki_id);
$stmt->execute();
$existing = $stmt->get_result()->fetch_assoc();
$stmt->close();

// return to data
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($existing) {
        echo json_encode($existing);
    } else {
        echo json_encode(['error' => 'Δεν υπάρχουν στοιχεία εξέτασης.']);
    }
    exit;
}

//insert i update analoga ti thelei
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $tropos = $_POST['tropos_exetasis'] ?? null;
    $input = $_POST['aithousa'] ?? null;
    $imerominia = $_POST['imerominia'] ?? null;
    $ora = $_POST['ora'] ?? null;

    if ($tropos && $input && $imerominia && $ora) {
        if ($tropos === "Dia Zosis") {
            $aithousa = $input;
            $link = null;
        } elseif ($tropos === "Diadiktiaka") {
            $aithousa = null;
            $link = $input;
        } else {
            echo json_encode(['error' => 'Μη έγκυρος τρόπος εξέτασης.']);
            exit;
        }

        if ($existing) {

            $sql = "UPDATE exetasi SET tropos_exetasis = ?, aithousa = ?, link = ?, imerominia = ?, ora = ? WHERE diplomatiki = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssssi", $tropos, $aithousa, $link, $imerominia, $ora, $diplomatiki_id);
        } else {

            $sql = "INSERT INTO exetasi (diplomatiki, tropos_exetasis, aithousa, link, imerominia, ora)
                    VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("isssss", $diplomatiki_id, $tropos, $aithousa, $link, $imerominia, $ora);
        }

        if ($stmt->execute()) {
            echo json_encode(['success' => $existing ? 'Η εξέταση ενημερώθηκε επιτυχώς!' : 'Η εξέταση καταχωρήθηκε επιτυχώς!']);
        } else {
            echo json_encode(['error' => 'Σφάλμα βάσης δεδομένων: ' . $stmt->error]);
        }

        $stmt->close();
    } else {
        echo json_encode(['error' => 'Παρακαλώ συμπληρώστε όλα τα πεδία.']);
    }
}

$conn->close();
?>
