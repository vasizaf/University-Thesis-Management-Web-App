<?php
session_start();
require_once 'database.php';
header('Content-Type: application/json');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

$diplomatiki_id = $_SESSION['diplomatiki_id'] ?? null;

if (!$diplomatiki_id) {
    echo json_encode(['error' => 'Δεν βρέθηκε διπλωματική.']);
    exit;
}

//fetch ta links
$sql_links = "SELECT link_number, link FROM links WHERE diplomatiki_id = ?";
$stmt_links = $conn->prepare($sql_links);
$stmt_links->bind_param("i", $diplomatiki_id);
$stmt_links->execute();
$result_links = $stmt_links->get_result();

$links = [];
while ($row = $result_links->fetch_assoc()) {
    $links[] = $row;
}
$stmt_links->close();

//to link gia ton nimerti
$sql_nimertis = "SELECT nimertis FROM diplomatiki WHERE id = ?";
$stmt_nimertis = $conn->prepare($sql_nimertis);
$stmt_nimertis->bind_param("i", $diplomatiki_id);
$stmt_nimertis->execute();
$result_nimertis = $stmt_nimertis->get_result();

$nimertis_link = null;
if ($row = $result_nimertis->fetch_assoc()) {
    $nimertis_link = $row['nimertis'];
}
$stmt_nimertis->close();

$conn->close();


echo json_encode([
    'links' => $links,
    'nimertis' => $nimertis_link
]);
