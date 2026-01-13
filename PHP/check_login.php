<?php
session_start();

include('database.php');

//checkarei to username kai password
if (isset($_POST['username']) && isset($_POST['password'])) {
    $username = $_POST['username'];
    $password = $_POST['password'];

    //kanei authenticate
    function authenticate_user($conn, $table, $username, $password) {
        $sql = "SELECT * FROM $table WHERE username = ? AND pass_word = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ss", $username, $password);
        $stmt->execute();
        $result = $stmt->get_result();
        $stmt->close();

        return $result->num_rows > 0;
    }

    //apothikeuei kai ton antistoixo role pou exei o user
    if (authenticate_user($conn, "kathigitis", $username, $password)) {
        $_SESSION['logged_in'] = true;
        $_SESSION['role'] = 'kathigitis';
        $_SESSION['username'] = $username;
        echo json_encode(['success' => true, 'role' => 'kathigitis', 'redirectUrl' => 'kathigitishome.html']);
        exit;
    }

    if (authenticate_user($conn, "foititis", $username, $password)) {
        $_SESSION['logged_in'] = true;
        $_SESSION['role'] = 'foititis';
        $_SESSION['username'] = $username;
        echo json_encode(['success' => true, 'role' => 'foititis', 'redirectUrl' => 'foititishome.html']);
        exit;
    }

    if (authenticate_user($conn, "grammateia", $username, $password)) {
        $_SESSION['logged_in'] = true;
        $_SESSION['role'] = 'grammateia';
        $_SESSION['username'] = $username;
        echo json_encode(['success' => true, 'role' => 'grammateia', 'redirectUrl' => 'grammateiahome.html']);
        exit;
    }

    echo json_encode(['error' => 'Invalid username or password']);
    exit;
}


echo json_encode(['error' => 'No data received']);
$conn->close();
?>
