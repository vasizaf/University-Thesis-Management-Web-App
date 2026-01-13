<?php
session_start();
include('../PHP/database.php'); // contains $servername, $username, $password, $dbname

require_once __DIR__ . '/auth_check.php';
require_role_or_die('grammateia');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    if (!isset($_FILES['jsonFile']) || $_FILES['jsonFile']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(["success" => false, "message" => "File upload failed."]);
        exit;
    }

    $fileTmp = $_FILES['jsonFile']['tmp_name'];
    $jsonContent = file_get_contents($fileTmp);

    $data = json_decode($jsonContent, true);
    if ($data === null) {
        echo json_encode(["success" => false, "message" => "Invalid JSON."]);
        exit;
    }

    if (!isset($data['foitites']) || !is_array($data['foitites'])) {
        echo json_encode(["success" => false, "message" => "JSON must contain a 'foitites' array."]);
        exit;
    }

    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Database connection error."]);
        exit;
    }

    $conn->set_charset("utf8mb4");

    $errors = [];
    $inserted = 0;

    $stmt = $conn->prepare("INSERT INTO foititis (am, username, pass_word, onoma, eponimo, etos, email, kinito, stathero, dieuthinsi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        echo json_encode([
            "success" => false,
            "message" => "SQL prepare error: " . $conn->error
        ]);
        exit;
    }

    foreach ($data['foitites'] as $student) {
        $required = ["am","username","pass_word","onoma","eponimo","etos","email","kinito","stathero","dieuthinsi"];
        $missing = array_filter($required, fn($f) => empty($student[$f]));
        if (count($missing) > 0) {
            $errors[] = "Missing fields for AM {$student['am']}: " . implode(", ", $missing);
            continue;
        }

        //to etos na einai int
        $etos = (int)$student['etos'];

        $stmt->bind_param(
            "sssssisiss",
            $student['am'],
            $student['username'],
            $student['pass_word'],
            $student['onoma'],
            $student['eponimo'],
            $etos,
            $student['email'],
            $student['kinito'],
            $student['stathero'],
            $student['dieuthinsi']
        );

        if ($stmt->execute()) {
            $inserted++;
        } else {
            $errors[] = "Insert error for AM {$student['am']}: " . $stmt->error;
        }
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        "success" => count($errors) === 0,
        "inserted" => $inserted,
        "errors" => $errors
    ]);
}
?>
