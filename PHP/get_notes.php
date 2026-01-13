<?php
session_start();
include('database.php');

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$professor = $_SESSION['username'];
$thesisId = isset($_GET['thesisId']) ? intval($_GET['thesisId']) : 0;
if (!$thesisId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing thesisId']);
    exit;
}

//to data tis diplomatikis mazi me tis simeioseis
$sql = "SELECT id, status_diplomatiki, epivlepontas, noumero1, noumero2,
               simeioseis_epivlepontas, simeioseis_noumero1, simeioseis_noumero2
        FROM diplomatiki
        WHERE id = ? LIMIT 1";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'DB prepare failed']);
    exit;
}
$stmt->bind_param('i', $thesisId);
$stmt->execute();
$res = $stmt->get_result();
$thesis = $res->fetch_assoc();
$stmt->close();

if (!$thesis) {
    http_response_code(404);
    echo json_encode(['error' => 'Thesis not found']);
    exit;
}

//otan einai accepted tha fainontai ta notes
if ($thesis['status_diplomatiki'] !== 'Accepted') {

    echo json_encode(['allowed' => false, 'reason' => 'status_not_accepted']);
    exit;
}

//thetoume poianou einai ta notes
$response = ['allowed' => false, 'fields' => []];

if ($thesis['epivlepontas'] === $professor) {
    $response['allowed'] = true;
    $response['fields']['simeioseis_epivlepontas'] = $thesis['simeioseis_epivlepontas'] ?? null;
}
if ($thesis['noumero1'] === $professor) {
    $response['allowed'] = true;
    $response['fields']['simeioseis_noumero1'] = $thesis['simeioseis_noumero1'] ?? null;
}
if ($thesis['noumero2'] === $professor) {
    $response['allowed'] = true;
    $response['fields']['simeioseis_noumero2'] = $thesis['simeioseis_noumero2'] ?? null;
}

echo json_encode($response);
exit;
