<?php
ob_start();

//tsekaroume tous rolous
session_start();
require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');
require_once 'database.php';

//kanoume force to json
header('Content-Type: application/json');

$response = [];


$diplomatiki_id = $_SESSION['diplomatiki_id'] ?? null;
$link           = trim($_POST['link'] ?? '');
$isFinal        = isset($_POST['final']) && $_POST['final'] === 'true';

//checkaroume an iparxoun ta stoixeia
if (!$diplomatiki_id || !$link) {
    $response = ['error' => 'Λείπουν δεδομένα.'];
    ob_clean();
    echo json_encode($response);
    exit();
}


if (!filter_var($link, FILTER_VALIDATE_URL)) {
    $response = ['error' => 'Μη έγκυρος σύνδεσμος.'];
    ob_clean();
    echo json_encode($response);
    exit();
}


if ($isFinal) {
    $requiredPrefix = 'https://nemertes.library.upatras.gr/';
    if (strpos($link, $requiredPrefix) !== 0) {
        $response = ['error' => "Ο σύνδεσμος πρέπει να ξεκινά με «{$requiredPrefix}»."];
        ob_clean();
        echo json_encode($response);
        exit();
    }
}


if ($isFinal) {
    $sql = "UPDATE diplomatiki SET nimertis = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $link, $diplomatiki_id);
} else {
    $sql = "INSERT INTO links (link, diplomatiki_id) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $link, $diplomatiki_id);
}


if ($stmt->execute()) {
    $response = ['success' => 'Ο σύνδεσμος προστέθηκε.'];
} else {
    $response = ['error'   => 'Σφάλμα βάσης δεδομένων.'];
}


$stmt->close();
$conn->close();
ob_clean();
echo json_encode($response);
exit();
