<?php
ini_set('display_errors', '0');
error_reporting(0);
ob_start();

session_start();
require_once 'database.php';
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

//epistrefoume json
header('Content-Type: application/json');


function json_exit(array $data, int $httpCode = 200): void {
    http_response_code($httpCode);
    ob_clean();
    echo json_encode($data);
    exit;
}



$payload   = json_decode(file_get_contents('php://input'), true);
$foititis  = $payload['foititis']  ?? null;
$diploma   = $payload['diploma']   ?? null;


if (empty($foititis) || empty($diploma)) {
    json_exit(['error' => 'Λείπουν δεδομένα (φοιτητής ή διπλωματική).'], 400);
}

//checkarei an iparxei i diplomatiki
$stmt = $conn->prepare("
    SELECT id
      FROM diplomatiki
     WHERE id = ?
       AND epivlepontas = ?
       AND id NOT IN (SELECT diplomatiki FROM analamvanei)
     LIMIT 1
");
$stmt->bind_param('is', $diploma, $_SESSION['username']);
$stmt->execute();
$result = $stmt->get_result();
$canAssign = (bool) $result->fetch_assoc();
$stmt->close();

if (! $canAssign) {
    json_exit(['error' => 'Η διπλωματική δεν είναι διαθέσιμη για ανάθεση.'], 400);
}


$stmt2 = $conn->prepare("
    INSERT INTO analamvanei (foititis, diplomatiki)
    VALUES (?, ?)
");
$stmt2->bind_param('si', $foititis, $diploma);

if (! $stmt2->execute()) {
    $err = $stmt2->error;
    $stmt2->close();
    $conn->close();
    json_exit(['error' => "Σφάλμα κατά την ανάθεση: $err"], 500);
}

$stmt2->close();
$conn->close();

json_exit(['success' => 'Η ανάθεση ολοκληρώθηκε.']);
