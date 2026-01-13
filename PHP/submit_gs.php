<?php

header('Content-Type: application/json; charset=UTF-8');

error_reporting(0);
ini_set('display_errors', '0');

require_once __DIR__ . '/database.php';

require_once __DIR__ . '/auth_check.php';
require_role_or_die('grammateia');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
      'success' => false,
      'error'   => 'Invalid request method'
    ]);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (
  ! isset($body['id']) ||
  ! isset($body['arithmos_gs'])
) {
    echo json_encode([
      'success' => false,
      'error'   => 'Missing id or arithmos_gs'
    ]);
    exit;
}

$id = intval($body['id']);
$gs = intval($body['arithmos_gs']);

// 7) Connect to MySQL
$mysqli = new mysqli($servername, $username, $password, $dbname);
if ($mysqli->connect_errno) {
    echo json_encode([
      'success' => false,
      'error'   => 'DB connect error: ' . $mysqli->connect_error
    ]);
    exit;
}


$sql = "UPDATE diplomatiki SET gs_anathesi = ? WHERE id = ?";
$stmt = $mysqli->prepare($sql);
if (! $stmt) {
    echo json_encode([
      'success' => false,
      'error'   => 'Prepare failed: ' . $mysqli->error
    ]);
    exit;
}

$stmt->bind_param('ii', $gs, $id);
$ok        = $stmt->execute();
$error_msg = $stmt->error;
$stmt->close();
$mysqli->close();


if ($ok) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode([
      'success' => false,
      'error'   => 'Update failed: ' . $error_msg
    ]);
}
exit;
