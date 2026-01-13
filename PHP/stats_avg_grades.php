<?php
session_start();
include('database.php');

header('Content-Type: application/json; charset=utf-8');

//checkarei tous rolouss
require_once __DIR__ . '/auth_check.php';
require_role_or_die('kathigitis');

$username = $_SESSION['username'];
$statuses = ['Finished','Accepted','Does not meet requirements','Under exam'];

//sql ean iparxei to sosto data
function view_exists($conn, $viewname) {
    $db = '';
    $q = $conn->query("SELECT DATABASE() AS db");
    if ($q) {
        $r = $q->fetch_assoc();
        $db = $r['db'];
        $q->free();
    }
    $stmt = $conn->prepare("
      SELECT COUNT(*) AS cnt
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
    ");
    $stmt->bind_param('ss', $db, $viewname);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return !empty($res['cnt']);
}

function column_exists($conn, $table, $column) {
    $db = '';
    $q = $conn->query("SELECT DATABASE() AS db");
    if ($q) {
        $r = $q->fetch_assoc();
        $db = $r['db'];
        $q->free();
    }
    $stmt = $conn->prepare("
      SELECT COUNT(*) AS cnt
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ? AND column_name = ?
    ");
    $stmt->bind_param('sss', $db, $table, $column);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return !empty($res['cnt']);
}

$use_view = view_exists($conn, 'v_diplomatiki_totals');
$has_total_column = column_exists($conn, 'diplomatiki_grades', 'total');

// ipologizei ta grades analoga me tin varitita pou exoun
$grade_expr = "(
    COALESCE(grade1,0) * 0.60
  + COALESCE(grade2,0) * 0.15
  + COALESCE(grade3,0) * 0.15
  + COALESCE(grade4,0) * 0.10
)";


if ($use_view) {
    //coalesce gia na paroume tis sostes non-null times
    $supSql = "
  SELECT
    COUNT(*) AS diplomas,
    AVG(final_total) AS avg,
    SUM( (ep_total IS NOT NULL) + (n1_total IS NOT NULL) + (n2_total IS NOT NULL) ) AS grade_count
  FROM (
    SELECT d.id,
      -- final_total computed as FULL TOTAL / 3 (missing totals are treated as 0)
      (COALESCE(ge.total,0) + COALESCE(gn1.total,0) + COALESCE(gn2.total,0)) / 3.0 AS final_total,
      ge.total AS ep_total,
      gn1.total AS n1_total,
      gn2.total AS n2_total
    FROM diplomatiki d
    LEFT JOIN v_diplomatiki_totals ge ON ge.diplomatiki_id = d.id
    LEFT JOIN v_diplomatiki_totals gn1 ON gn1.diplomatiki_id = d.id
    LEFT JOIN v_diplomatiki_totals gn2 ON gn2.diplomatiki_id = d.id
    WHERE d.status_diplomatiki = 'Finished' AND d.epivlepontas = ?
  ) x
";
    $stmt = $conn->prepare($supSql);
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $supFinished = $stmt->get_result()->fetch_assoc() ?: ['diplomas'=>0,'avg'=>null,'grade_count'=>0];
    $stmt->close();

    $comSql = "
      SELECT
        COUNT(*) AS diplomas,
        AVG( (COALESCE(ep_total,0)+COALESCE(n1_total,0)+COALESCE(n2_total,0))/3.0 ) AS avg,
        SUM( (ep_total IS NOT NULL) + (n1_total IS NOT NULL) + (n2_total IS NOT NULL) ) AS grade_count
      FROM v_diplomatiki_totals
      WHERE status_diplomatiki = 'Finished' AND (noumero1 = ? OR noumero2 = ?)
    ";
    $stmt = $conn->prepare($comSql);
    $stmt->bind_param('ss', $username, $username);
    $stmt->execute();
    $comFinished = $stmt->get_result()->fetch_assoc() ?: ['diplomas'=>0,'avg'=>null,'grade_count'=>0];
    $stmt->close();
} else {
//xrisimopoioume to total
    $sub_ge = $has_total_column
      ? "(SELECT diplomatiki_id, total FROM diplomatiki_grades WHERE grader_role = 'epivlepontas')"
      : "(SELECT diplomatiki_id, $grade_expr AS total FROM diplomatiki_grades WHERE grader_role = 'epivlepontas')";

    $sub_gn1 = $has_total_column
      ? "(SELECT diplomatiki_id, total FROM diplomatiki_grades WHERE grader_role = 'noumero1')"
      : "(SELECT diplomatiki_id, $grade_expr AS total FROM diplomatiki_grades WHERE grader_role = 'noumero1')";

    $sub_gn2 = $has_total_column
      ? "(SELECT diplomatiki_id, total FROM diplomatiki_grades WHERE grader_role = 'noumero2')"
      : "(SELECT diplomatiki_id, $grade_expr AS total FROM diplomatiki_grades WHERE grader_role = 'noumero2')";

    //gia epivleponta
    $supSql = "
      SELECT
        COUNT(*) AS diplomas,
        AVG(final_total) AS avg,
        SUM( (ep_total IS NOT NULL) + (n1_total IS NOT NULL) + (n2_total IS NOT NULL) ) AS grade_count
      FROM (
        SELECT d.id,
          -- final_total computed as FULL TOTAL / 3 (missing totals treated as 0)
          (COALESCE(ge.total,0) + COALESCE(gn1.total,0) + COALESCE(gn2.total,0)) / 3.0 AS final_total,
          ge.total AS ep_total,
          gn1.total AS n1_total,
          gn2.total AS n2_total
        FROM diplomatiki d
        LEFT JOIN $sub_ge ge ON ge.diplomatiki_id = d.id
        LEFT JOIN $sub_gn1 gn1 ON gn1.diplomatiki_id = d.id
        LEFT JOIN $sub_gn2 gn2 ON gn2.diplomatiki_id = d.id
        WHERE d.status_diplomatiki = 'Finished' AND d.epivlepontas = ?
      ) x
    ";
    $stmt = $conn->prepare($supSql);
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $supFinished = $stmt->get_result()->fetch_assoc() ?: ['diplomas'=>0,'avg'=>null,'grade_count'=>0];
    $stmt->close();

    //noumero1 + noumero2
    $comSql = "
      SELECT
        COUNT(*) AS diplomas,
        AVG(final_total) AS avg,
        SUM( (ep_total IS NOT NULL) + (n1_total IS NOT NULL) + (n2_total IS NOT NULL) ) AS grade_count
      FROM (
        SELECT d.id,
          -- final_total computed as FULL TOTAL / 3 (missing totals treated as 0)
          (COALESCE(ge.total,0) + COALESCE(gn1.total,0) + COALESCE(gn2.total,0)) / 3.0 AS final_total,
          ge.total AS ep_total,
          gn1.total AS n1_total,
          gn2.total AS n2_total
        FROM diplomatiki d
        LEFT JOIN $sub_ge ge ON ge.diplomatiki_id = d.id
        LEFT JOIN $sub_gn1 gn1 ON gn1.diplomatiki_id = d.id
        LEFT JOIN $sub_gn2 gn2 ON gn2.diplomatiki_id = d.id
        WHERE d.status_diplomatiki = 'Finished' AND (d.noumero1 = ? OR d.noumero2 = ?)
      ) x
    ";
    $stmt = $conn->prepare($comSql);
    $stmt->bind_param('ss', $username, $username);
    $stmt->execute();
    $comFinished = $stmt->get_result()->fetch_assoc() ?: ['diplomas'=>0,'avg'=>null,'grade_count'=>0];
    $stmt->close();
}

//null otan den iparxoun
if (isset($supFinished['diplomas']) && intval($supFinished['diplomas']) === 0) $supFinished['avg'] = null;
if (isset($comFinished['diplomas']) && intval($comFinished['diplomas']) === 0) $comFinished['avg'] = null;

$supFinished['diplomas'] = intval($supFinished['diplomas'] ?? 0);
$supFinished['grade_count'] = intval($supFinished['grade_count'] ?? 0);
$supFinished['avg'] = isset($supFinished['avg']) ? floatval($supFinished['avg']) : null;

$comFinished['diplomas'] = intval($comFinished['diplomas'] ?? 0);
$comFinished['grade_count'] = intval($comFinished['grade_count'] ?? 0);
$comFinished['avg'] = isset($comFinished['avg']) ? floatval($comFinished['avg']) : null;

//ipologizoume ta totals
$totals_supervised = [];
$totals_committee = [];
foreach ($statuses as $s) {
    //epivlepontas
    $sqlS = "SELECT COUNT(*) AS c FROM diplomatiki WHERE status_diplomatiki = ? AND epivlepontas = ?";
    $st = $conn->prepare($sqlS); $st->bind_param('ss', $s, $username); $st->execute();
    $r = $st->get_result()->fetch_assoc(); $st->close();
    $totals_supervised[$s] = intval($r['c'] ?? 0);

    //noumero1 + noumero2
    $sqlC = "SELECT COUNT(*) AS c FROM diplomatiki WHERE status_diplomatiki = ? AND (noumero1 = ? OR noumero2 = ?)";
    $st2 = $conn->prepare($sqlC); $st2->bind_param('sss', $s, $username, $username); $st2->execute();
    $r2 = $st2->get_result()->fetch_assoc(); $st2->close();
    $totals_committee[$s] = intval($r2['c'] ?? 0);
}


$payload = [
    'avg_finished' => [
        'supervised' => $supFinished,
        'committee'  => $comFinished
    ],
    'statuses' => $statuses,
    'totals' => [
        'supervised' => $totals_supervised,
        'committee'  => $totals_committee
    ],
    'avg_completion' => null,
];

//to stelnoume
echo json_encode($payload, JSON_UNESCAPED_UNICODE);
exit;