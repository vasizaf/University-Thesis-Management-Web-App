<?php
session_start();
include('../PHP/database.php');

require_once __DIR__ . '/auth_check.php';
require_role_or_die('grammateia');

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    //checkaroume ean to arxeio anevike kanonika
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

    if (!isset($data['professors']) || !is_array($data['professors'])) {
        echo json_encode(["success" => false, "message" => "JSON must contain a 'professors' array."]);
        exit;
    }

    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Database connection error."]);
        exit;
    }

    //paketo gia ellinikous characters
    $conn->set_charset("utf8mb4");

    $errors = [];
    $inserted = 0;

    $stmt = $conn->prepare("
        INSERT INTO kathigitis (username, pass_word, profession, email, onoma, eponimo, tilefono)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "SQL prepare error: " . $conn->error]);
        exit;
    }

    foreach ($data['professors'] as $prof) {
        $required = ["username","pass_word","profession","email","onoma","eponimo","tilefono"];
        $missing = array_filter($required, fn($f) => empty($prof[$f]));
        if (!empty($missing)) {
            $errors[] = "Missing fields for username {$prof['username']}: " . implode(", ", $missing);
            continue;
        }

        if (!in_array($prof['profession'], ["TEE","DEP","EEP","EDIP","ETEP"])) {
            $errors[] = "Invalid profession for username {$prof['username']}";
            continue;
        }
        if (!str_ends_with($prof['email'], "@ceid.upatras.gr")) {
            $errors[] = "Invalid email for username {$prof['username']}";
            continue;
        }
        if (strlen($prof['tilefono']) !== 10 || !ctype_digit($prof['tilefono'])) {
            $errors[] = "Invalid phone number for username {$prof['username']}";
            continue;
        }

        $stmt->bind_param(
            "ssssssi",
      $prof['username'],
     $prof['pass_word'],
            $prof['profession'],
            $prof['email'],
            $prof['onoma'],
            $prof['eponimo'],
            $prof['tilefono']
        );

        if ($stmt->execute()) {
            $inserted++;
        } else {
            $errors[] = "Insert error for username {$prof['username']}: " . $stmt->error;
        }
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        "success" => empty($errors),
        "inserted" => $inserted,
        "errors" => $errors
    ]);
}
?>
