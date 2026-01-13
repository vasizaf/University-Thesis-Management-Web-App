<?php
session_start();
include('database.php');
require_once __DIR__ . '/auth_check.php';
require_role_or_die('foititis');

header('Content-Type: application/json');


$username = $_SESSION['username'] ?? null;

if (!$username) {
    echo json_encode(['error' => 'Session expired or username missing']);
    exit;
}

// Fetch student information
$sql = "SELECT * FROM foititis WHERE username = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows !== 1) {
    echo json_encode(['error' => 'Student not found']);
    exit;
}

$student = $result->fetch_assoc();
$stmt->close();


$sql = "SELECT diplomatiki, imerominia_enarxis FROM analamvanei WHERE foititis = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $row = $result->fetch_assoc();
    $thesisId = $row['diplomatiki'];
    $startDate = $row['imerominia_enarxis'];

    //store to data
    $_SESSION['diplomatiki_id'] = $thesisId;


    $sql2 = "SELECT * FROM diplomatiki WHERE id = ?";
    $stmt2 = $conn->prepare($sql2);
    $stmt2->bind_param("i", $thesisId);
    $stmt2->execute();
    $result2 = $stmt2->get_result();

    if ($result2->num_rows === 1) {
        $thesis = $result2->fetch_assoc();

        //vazoume ta stoixeia se ena array
        $student['thesis'] = [
            'id' => $thesis['id'],
            'title' => $thesis['titlos'],
            'summary' => $thesis['perigrafi'],
            'file' => $thesis['arxeio_perigrafis'],
            'notes' => $thesis['simeiosis'],
            'status' => $thesis['status_diplomatiki'],
            'switch' => $thesis['switch'],
            'supervisor' => $thesis['epivlepontas'],
            'committee' => implode(', ', array_filter([$thesis['noumero1'], $thesis['noumero2']]))
        ];


        $student['thesis_start_date'] = $startDate;


        $grades = [];
        $sql3 = "SELECT grader_username, grade1, grade2, grade3, grade4 FROM diplomatiki_grades WHERE diplomatiki_id = ?";
        $stmt3 = $conn->prepare($sql3);
        $stmt3->bind_param("i", $thesisId);
        $stmt3->execute();
        $result3 = $stmt3->get_result();

        $finalGrades = [];
        while ($row3 = $result3->fetch_assoc()) {
            // Calculate weighted grade for this professor
            if (
                is_numeric($row3['grade1']) &&
                is_numeric($row3['grade2']) &&
                is_numeric($row3['grade3']) &&
                is_numeric($row3['grade4'])
            ) {
                $weighted =
                    0.6 * floatval($row3['grade1']) +
                    0.15 * floatval($row3['grade2']) +
                    0.15 * floatval($row3['grade3']) +
                    0.1 * floatval($row3['grade4']);
                $finalGrades[] = $weighted;
            }
        }
        $stmt3->close();

        if (count($finalGrades) === 3) {
            $finalGrade = array_sum($finalGrades) / 3.0;
            $student['vathmos'] = round($finalGrade, 2);
        } else {
            $student['vathmos'] = null;
        }
    } else {
        $student['thesis'] = null;
        $student['thesis_start_date'] = null;
        $student['vathmos'] = null;
    }
    $stmt2->close();
} else {
    $student['thesis'] = null;
    $student['thesis_start_date'] = null;
    $student['vathmos'] = null;
}

$stmt->close();
$conn->close();

// Return combined student + thesis data
echo json_encode($student);
