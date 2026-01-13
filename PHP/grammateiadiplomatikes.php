<?php

session_start();
include __DIR__ . '/database.php';
require_once __DIR__ . '/auth_check.php';
require_role_or_die('grammateia');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed']);
    exit;
}

$sql = "
  SELECT
    d.*,
    a.foititis       AS student_id,
    f.onoma          AS student_name,
    f.eponimo        AS student_surname,
    (
      SELECT COUNT(*)
      FROM diplomatiki_grades dg
      WHERE dg.diplomatiki_id = d.id
        AND dg.grade1 IS NOT NULL
        AND dg.grade2 IS NOT NULL
        AND dg.grade3 IS NOT NULL
        AND dg.grade4 IS NOT NULL
    ) AS completed_graders
  FROM diplomatiki d
  LEFT JOIN analamvanei a ON a.diplomatiki = d.id
  LEFT JOIN foititis   f ON f.username   = a.foititis
";
$result = $conn->query($sql);
if (! $result) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed']);
    $conn->close();
    exit;
}

$diplomatikes = [];
while ($row = $result->fetch_assoc()) {
    // Compute weighted average score across all graders
    $gStmt = $conn->prepare("
      SELECT grade1, grade2, grade3, grade4
      FROM diplomatiki_grades
      WHERE diplomatiki_id = ?
    ");
    $gStmt->bind_param('i', $row['id']);
    $gStmt->execute();
    $gResult = $gStmt->get_result();

    $weightedScores = [];
    while ($g = $gResult->fetch_assoc()) {
        if (
            is_numeric($g['grade1']) &&
            is_numeric($g['grade2']) &&
            is_numeric($g['grade3']) &&
            is_numeric($g['grade4'])
        ) {
            $score = 0.6 * $g['grade1']
                   + 0.15 * $g['grade2']
                   + 0.15 * $g['grade3']
                   + 0.10 * $g['grade4'];
            $weightedScores[] = $score;
        }
    }
    $gStmt->close();

    if (count($weightedScores) > 0) {
        $avg = array_sum($weightedScores) / count($weightedScores);
        $row['average_score'] = round($avg, 2);
    } else {
        $row['average_score'] = null;
    }

    $diplomatikes[] = $row;
}

$conn->close();
echo json_encode([
    'count'        => count($diplomatikes),
    'diplomatikes' => $diplomatikes
]);
