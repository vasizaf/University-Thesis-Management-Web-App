<?php
session_start();
header('Content-Type: application/json');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
include 'database.php';
require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

//apotrepoume ta html errors
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

try {
    $studentUsername = $_SESSION['username'];

    $stmt = $conn->prepare("
        SELECT diplomatiki
        FROM analamvanei
        WHERE foititis = ?
    ");
    $stmt->bind_param("s", $studentUsername);
    $stmt->execute();
    $stmt->bind_result($assignedThesisId);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'No assigned thesis']);
        exit;
    }
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT epivlepontas
        FROM diplomatiki
        WHERE id = ?
    ");
    $stmt->bind_param("i", $assignedThesisId);
    $stmt->execute();
    $stmt->bind_result($supervisor);
    $stmt->fetch();
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT kathigitis
        FROM aitisi
        WHERE foititis = ? AND katastasi IN ('Pending', 'Accepted')
    ");
    $stmt->bind_param("s", $studentUsername);
    $stmt->execute();
    $result = $stmt->get_result();

    $appliedTo = [];
    while ($row = $result->fetch_assoc()) {
        $appliedTo[] = $row['kathigitis'];
    }
    $stmt->close();

    //oloi oi kathigites ektos apo ton supervisor kai autous pou exei idi kanei aitisi
    $stmt = $conn->prepare("
        SELECT username, onoma, eponimo
        FROM kathigitis
        WHERE username <> ?
    ");
    $stmt->bind_param("s", $supervisor);
    $stmt->execute();
    $stmt->bind_result($user, $first, $last);

    $availableProfessors = [];
    while ($stmt->fetch()) {
        if (!in_array($user, $appliedTo)) {
            $availableProfessors[] = [
                'username' => $user,
                'label'    => "$first $last"
            ];
        }
    }
    $stmt->close();
    $conn->close();


    echo json_encode([
        'assignedThesisId' => $assignedThesisId,
        'supervisor'       => $supervisor,
        'professors'       => $availableProfessors
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'details' => $e->getMessage()
    ]);
}