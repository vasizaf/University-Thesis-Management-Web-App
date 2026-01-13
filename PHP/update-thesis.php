<?php

session_start();
include('database.php');


require_once __DIR__ . '/auth_check.php';

require_role_or_die(['kathigitis', 'grammateia']);



if($_SERVER["REQUEST_METHOD"] === "POST") {
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Σφάλμα σύνδεσης με τη βάση."]);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
        $data = $_POST;
    }

    $thesis_id = $data['id'];
    $status = $data['status_diplomatiki'];
    $datetime = date('Y-m-d H:i:s');

    if ($thesis_id && $status) {
        $stmt = $conn->prepare("UPDATE diplomatiki SET status_diplomatiki = ? WHERE id = ?");
        $stmt->bind_param('si', $status, $thesis_id);
        $success = $stmt->execute();
        $stmt->close();


        $stmt1 = $conn->prepare("UPDATE analamvanei set imerominia_lixis = ? where diplomatiki = ?");
        $stmt1->bind_param('si', $datetime, $thesis_id);
        $success1 = $stmt1->execute();
        $stmt1->close();

        if ($success && $success1) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Update failed']);
        }


    } else {
        echo json_encode(['success' => false, 'error' => 'Missing or invalid data']);
    }

    $conn->close();
}