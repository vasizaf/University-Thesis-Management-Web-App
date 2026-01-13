<?php
session_start();
include('database.php');

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$professor = $_SESSION['username'];
$allowed_filters = ['epivlepontas', 'noumero1', 'noumero2', 'trimelis'];

$filter = $_GET['filter'] ?? 'epivlepontas';
if (!in_array($filter, $allowed_filters, true)) {
    echo json_encode(['error' => 'Invalid filter']);
    exit;
}

//left join tous vathmous gia na ipologisoume kai meta kai ton total
$selectGrades = "
  ge.grade1 AS ep_grade1, ge.grade2 AS ep_grade2, ge.grade3 AS ep_grade3, ge.grade4 AS ep_grade4,
  ge.grader_username AS ep_grader_username,
  gn1.grade1 AS n1_grade1, gn1.grade2 AS n1_grade2, gn1.grade3 AS n1_grade3, gn1.grade4 AS n1_grade4,
  gn1.grader_username AS n1_grader_username,
  gn2.grade1 AS n2_grade1, gn2.grade2 AS n2_grade2, gn2.grade3 AS n2_grade3, gn2.grade4 AS n2_grade4,
  gn2.grader_username AS n2_grader_username
";

if ($filter === 'trimelis') {
    $sql = "SELECT d.id, d.titlos, d.perigrafi, d.arxeio_perigrafis, d.simeiosis,
                   d.status_diplomatiki, d.switch, d.epivlepontas, d.noumero1, d.noumero2,
                   e.proxeiro_keimeno,
                   $selectGrades
            FROM diplomatiki d
            LEFT JOIN exetasi e ON e.diplomatiki = d.id
            LEFT JOIN diplomatiki_grades ge ON ge.diplomatiki_id = d.id AND ge.grader_role = 'epivlepontas'
            LEFT JOIN diplomatiki_grades gn1 ON gn1.diplomatiki_id = d.id AND gn1.grader_role = 'noumero1'
            LEFT JOIN diplomatiki_grades gn2 ON gn2.diplomatiki_id = d.id AND gn2.grader_role = 'noumero2'
            WHERE d.noumero1 = ? OR d.noumero2 = ?";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        echo json_encode(['error' => 'Failed to prepare: ' . $conn->error]);
        exit;
    }
    $stmt->bind_param("ss", $professor, $professor);
} else {
    $sql = "SELECT d.id, d.titlos, d.perigrafi, d.arxeio_perigrafis, d.simeiosis,
                   d.status_diplomatiki, d.switch, d.epivlepontas, d.noumero1, d.noumero2,
                   e.proxeiro_keimeno,
                   $selectGrades
            FROM diplomatiki d
            LEFT JOIN exetasi e ON e.diplomatiki = d.id
            LEFT JOIN diplomatiki_grades ge ON ge.diplomatiki_id = d.id AND ge.grader_role = 'epivlepontas'
            LEFT JOIN diplomatiki_grades gn1 ON gn1.diplomatiki_id = d.id AND gn1.grader_role = 'noumero1'
            LEFT JOIN diplomatiki_grades gn2 ON gn2.diplomatiki_id = d.id AND gn2.grader_role = 'noumero2'
            WHERE d.$filter = ?";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        echo json_encode(['error' => 'Failed to prepare: ' . $conn->error]);
        exit;
    }
    $stmt->bind_param("s", $professor);
}

$stmt->execute();
$result = $stmt->get_result();
$diplomatikes = $result->fetch_all(MYSQLI_ASSOC);

echo json_encode([
    'filter' => $filter,
    'value' => $professor,
    'count' => count($diplomatikes),
    'diplomatikes' => $diplomatikes,
    'userInfo' => [
        'role' => $_SESSION['role'],
        'username' => $_SESSION['username']
    ]
]);

$stmt->close();
$conn->close();
