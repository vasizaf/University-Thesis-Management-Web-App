<?php
session_start();
require_once 'database.php';

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$professor = $_SESSION['username'];

$sql = "SELECT id, titlos FROM diplomatiki 
        WHERE epivlepontas = ? 
          AND id NOT IN (SELECT diplomatiki FROM analamvanei)";

$stmt = $conn->prepare($sql);
$stmt->bind_param('s', $professor);
$stmt->execute();
$res = $stmt->get_result();

$diplomas = [];
while ($row = $res->fetch_assoc()) {
    $diplomas[] = $row;
}

header('Content-Type: application/json');
echo json_encode($diplomas);
