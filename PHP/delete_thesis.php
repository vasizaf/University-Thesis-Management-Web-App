<?php
//svinei ta errors pou isos empodisoun to json
error_reporting(0);
ini_set('display_errors', 0);

//buffer
ob_start();


header('Content-Type: application/json; charset=UTF-8');


require_once __DIR__ . '/database.php';

require_once __DIR__ . '/auth_check.php';
require_role_or_die('grammateia');


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error'   => 'Invalid request method'
    ]);
    exit;
}


$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || empty($input)) {
    $input = $_POST;
}

//extract kai check ta inputs ean einai sosta
$id          = isset($input['id'])           ? intval($input['id'])           : 0;
$arithmosG   = isset($input['arithmos_gs'])  ? intval($input['arithmos_gs'])  : 0;
$etos        = isset($input['etos'])         ? intval($input['etos'])         : 0;
$apologia    = isset($input['apologia'])     ? trim($input['apologia'])       : '';

if ($id <= 0 || $arithmosG <= 0 || $etos <= 0 || $apologia === '') {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error'   => 'Missing or invalid data'
    ]);
    exit;
}


$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    ob_clean();
    echo json_encode([
        'success' => false,
        'error'   => 'Database connection failed'
    ]);
    exit;
}

//stoixeia gia tin diplomatiki
$sql  = "
    SELECT
      d.titlos         AS titlos,
      d.epivlepontas  AS kathigitis,
      a.foititis      AS foititis
    FROM diplomatiki d
    JOIN analamvanei a
      ON a.diplomatiki = d.id
    WHERE d.id = ?
    LIMIT 1
";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $id);
$stmt->execute();
$stmt->bind_result($titlos, $kathigitis, $foititis);

if (! $stmt->fetch()) {
    $stmt->close();
    $conn->close();
    ob_clean();
    echo json_encode([
        'success' => false,
        'error'   => 'Thesis or student not found'
    ]);
    exit;
}
$stmt->close();

//insert sto canceled_theses
$insertSql = "
    INSERT INTO canceled_theses
      (diplomatiki_id, titlos, foititis, kathigitis, arithmos_gs, etos, apologia)
    VALUES (?, ?, ?, ?, ?, ?, ?)
";
$ins = $conn->prepare($insertSql);
$ins->bind_param(
    'isssiis',
    $id,
    $titlos,
    $foititis,
    $kathigitis,
    $arithmosG,
    $etos,
    $apologia
);
$okInsert = $ins->execute();
$insertErr = $ins->error;
$ins->close();

if (! $okInsert) {
    $conn->close();
    ob_clean();
    echo json_encode([
        'success' => false,
        'error'   => "Archive failed: $insertErr"
    ]);
    exit;
}


$del = $conn->prepare('DELETE FROM diplomatiki WHERE id = ?');
$del->bind_param('i', $id);
$okDelete = $del->execute();
$delErr   = $del->error;
$del->close();
$conn->close();


ob_clean();
if ($okDelete) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode([
        'success' => false,
        'error'   => "Delete failed: $delErr"
    ]);
}
exit;
