<?php
session_start();
header('Content-Type: application/json');
include 'database.php';

require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

$foititis = $_SESSION['username'];

$stmt = $conn->prepare("
    SELECT a.katastasi, a.imerominia_apantisis, k.onoma, k.eponimo
    FROM aitisi a
    JOIN kathigitis k ON a.kathigitis = k.username
    WHERE a.foititis = ?
    ORDER BY a.imerominia_prosklisis DESC
");
$stmt->bind_param("s", $foititis);
$stmt->execute();
$stmt->bind_result($katastasi, $apantisiDate, $onoma, $eponimo);

$applications = [];
while ($stmt->fetch()) {
    $applications[] = [
        'professorName' => "$onoma $eponimo",
        'status'        => $katastasi,
        'answer'        => $apantisiDate ?? ''
    ];
}

$stmt->close();
$conn->close();

error_log("Returning applications: " . print_r($applications, true));

echo json_encode($applications);
