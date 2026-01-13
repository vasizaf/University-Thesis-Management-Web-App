<?php
// grammateiainsertmanual.php - debug-friendly, JSON-only endpoint
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

$DEBUG = true; // set false when you're done debugging

if (session_status() === PHP_SESSION_NONE) session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/database.php'; // should provide $conn or DB vars

function json_out($payload, $http_status = 200) {
    http_response_code($http_status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

// quick auth: ensure session role is grammateia (no redirects)
$userRole = $_SESSION['role'] ?? null;
if (!$userRole) json_out(['success'=>false,'message'=>'Not authenticated'],401);
if ($userRole !== 'grammateia') json_out(['success'=>false,'message'=>'Forbidden - insufficient role'],403);

// ensure $conn
if (!isset($conn) || !($conn instanceof mysqli)) {
    if (isset($servername, $username, $password, $dbname)) {
        $conn = new mysqli($servername, $username, $password, $dbname);
    } else {
        error_log('No $conn and no DB config');
        json_out(['success'=>false,'message'=>'Server DB configuration error'],500);
    }
}
if ($conn->connect_error) {
    error_log('DB connect error: ' . $conn->connect_error);
    json_out(['success'=>false,'message'=>'Σφάλμα σύνδεσης με τη βάση.'],500);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['success'=>false,'message'=>'Μη υποστηριζόμενη μέθοδος αιτήματος.'],405);

$formType = $_POST['formType'] ?? '';

try {
  if ($formType === 'student') {
    // read raw inputs
    $raw = [];
    foreach (['am','username','pass_word','onoma','eponimo','etos','email','kinito','stathero','dieuthinsi'] as $f) {
      $raw[$f] = isset($_POST[$f]) ? trim($_POST[$f]) : '';
    }

    // validation with specific messages
    if ($raw['am'] === '') json_out(['success'=>false,'message'=>'Το πεδίο am είναι υποχρεωτικό.'],400);
    if (!preg_match('/^[0-9]{7}$/', $raw['am'])) json_out(['success'=>false,'message'=>'AM πρέπει να είναι 7 ψηφία (π.χ. 1234567).'],400);
    $am = intval($raw['am']);

    if ($raw['username'] === '') json_out(['success'=>false,'message'=>'Το username είναι υποχρεωτικό.'],400);
    // Accept username starting with up (DB CHECK was username LIKE 'up%')
    if (!preg_match('/^up/i', $raw['username'])) {
      json_out(['success'=>false,'message'=>"Το username πρέπει να ξεκινάει με 'up' (π.χ. up1234567)."],400);
    }
    $username = $raw['username'];

    if ($raw['pass_word'] === '') json_out(['success'=>false,'message'=>'Το πεδίο pass_word είναι υποχρεωτικό.'],400);
    $pass_word = $raw['pass_word'];

    if ($raw['onoma'] === '' || $raw['eponimo'] === '') json_out(['success'=>false,'message'=>'onoma και eponimo είναι υποχρεωτικά.'],400);

    if ($raw['etos'] === '') json_out(['success'=>false,'message'=>'Το πεδίο etos είναι υποχρεωτικό.'],400);
    if (!preg_match('/^[0-9]{4}$/', $raw['etos'])) json_out(['success'=>false,'message'=>'Το etos πρέπει να είναι 4 ψηφία.'],400);
    $etos = intval($raw['etos']);
    $curYear = intval(date('Y'));
    if ($etos < 1900 || $etos > $curYear + 1) json_out(['success'=>false,'message'=>"Το etos πρέπει να είναι μεταξύ 1900 και " . ($curYear+1) . "."],400);

    if ($raw['email'] === '') json_out(['success'=>false,'message'=>'Το email είναι υποχρεωτικό.'],400);
    if (!preg_match('/^[^@]+@ceid\.upatras\.gr$/i', $raw['email'])) {
      json_out(['success'=>false,'message'=>'Το email πρέπει να τελειώνει σε @ceid.upatras.gr.'],400);
    }
    $email = $raw['email'];

    // normalize phones
    $kinito = $raw['kinito'] === '' ? null : preg_replace('/\D+/', '', $raw['kinito']);
    if ($kinito !== null && strlen($kinito) !== 10) json_out(['success'=>false,'message'=>'Το kinito πρέπει να έχει 10 ψηφία.'],400);

    $stathero = $raw['stathero'] === '' ? null : preg_replace('/\D+/', '', $raw['stathero']);
    if ($stathero !== null && strlen($stathero) !== 10) json_out(['success'=>false,'message'=>'Το stathero πρέπει να έχει 10 ψηφία.'],400);

    $dieuthinsi = $raw['dieuthinsi'];

    // now attempt insert
    $sql = "INSERT INTO foititis (am, username, pass_word, onoma, eponimo, etos, email, kinito, stathero, dieuthinsi)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
      throw new Exception('Prepare failed: ' . $conn->error);
    }
    if (!$stmt->bind_param("issssissss",
      $am, $username, $pass_word, $raw['onoma'], $raw['eponimo'],
      $etos, $email, $kinito, $stathero, $dieuthinsi
    )) {
      throw new Exception('bind_param failed: ' . $stmt->error);
    }
    if (!$stmt->execute()) {
      $err = $stmt->error;
      // specific handling if DB says a check constraint is violated
      if (stripos($err, 'Check constraint') !== false || stripos($err, 'check constraint') !== false) {
        // parse constraint name from error message (pattern may vary)
        if (preg_match("/Check constraint '([^']+)' is violated/i", $err, $m)) {
          $constraintName = $m[1];
        } elseif (preg_match('/check constraint `([^`]+)`/i', $err, $m)) {
          $constraintName = $m[1];
        } else {
          $constraintName = '(unknown)';
        }

        $debug = ['db_error' => $err, 'constraint' => $constraintName];

        // try to fetch check_clause(s) for that constraint (MySQL 8+)
        if ($constraintName !== '(unknown)') {
          $q = $conn->prepare("
            SELECT CHECK_CLAUSE 
            FROM information_schema.check_constraints 
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?
          ");
          if ($q) {
            $q->bind_param('s', $constraintName);
            $q->execute();
            $res = $q->get_result();
            $clauses = [];
            while ($row = $res->fetch_assoc()) $clauses[] = $row['CHECK_CLAUSE'];
            $q->close();
            if ($clauses) $debug['check_clauses'] = $clauses;
          }
        }

        // respond with useful info
        $out = ['success' => false, 'message' => 'DB check constraint violated', 'detail' => $err];
        if ($DEBUG) $out['debug'] = $debug;
        json_out($out, 500);
      }

      throw new Exception('Execute failed: ' . $err);
    }

    $stmt->close();
    json_out(['success'=>true,'message'=>'Ο φοιτητής προστέθηκε επιτυχώς.'],200);
  }

  if ($formType === 'professor') {
    // minimal professor branch (validate tilefono)
    $username = trim($_POST['username'] ?? '');
    $pass_word = trim($_POST['pass_word'] ?? '');
    $tilefono_raw = trim($_POST['tilefono'] ?? '');
    $profession = trim($_POST['profession'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $onoma = trim($_POST['onoma'] ?? '');
    $eponimo = trim($_POST['eponimo'] ?? '');

    if ($username === '' || $pass_word === '' || $tilefono_raw === '' || $profession === '' || $email === '') {
      json_out(['success'=>false,'message'=>'Λείπουν υποχρεωτικά πεδία.'],400);
    }

    $tilefono = preg_replace('/\D+/', '', $tilefono_raw);
    if (strlen($tilefono) !== 10) json_out(['success'=>false,'message'=>'Το τηλέφωνο πρέπει να έχει 10 ψηφία.'],400);

    $sql = "INSERT INTO kathigitis (username, pass_word, tilefono, profession, email, onoma, eponimo)
            VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    if (!$stmt->bind_param("sssssss", $username, $pass_word, $tilefono, $profession, $email, $onoma, $eponimo)) {
      throw new Exception('bind_param failed: ' . $stmt->error);
    }
    if (!$stmt->execute()) {
      $err = $stmt->error;
      // similar check-handling if needed
      json_out(['success'=>false,'message'=>'Αποτυχία εισαγωγής: ' . $err, 'detail'=>$err],500);
    }
    $stmt->close();
    json_out(['success'=>true,'message'=>'Ο διδάσκων προστέθηκε επιτυχώς.'],200);
  }

  json_out(['success'=>false,'message'=>'Άγνωστος τύπος φόρμας.'],400);

} catch (Throwable $e) {
  error_log('Exception in grammateiainsertmanual.php: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
  $out = ['success'=>false,'message'=>'Server error'];
  if ($DEBUG) $out['detail'] = $e->getMessage();
  json_out($out,500);
}