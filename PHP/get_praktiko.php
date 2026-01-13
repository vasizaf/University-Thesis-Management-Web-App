<?php

header('Content-Type: application/json; charset=utf-8');

include __DIR__ . '/database.php'; // your unchanged database.php (mysqli $conn)

session_start();
if (!isset($_SESSION['username']) || empty($_SESSION['username'])) {
    echo json_encode(['success' => false, 'error' => 'Not logged in']);
    exit;
}
$foititis_username = $_SESSION['username'];

try {
    //vriskoume tin diplomatiki tou foititi
    $sql = "SELECT diplomatiki, imerominia_enarxis, imerominia_lixis
            FROM analamvanei
            WHERE foititis = ?
            ORDER BY imerominia_enarxis DESC
            LIMIT 1";
    $st = $conn->prepare($sql);
    if (!$st) throw new Exception($conn->error);
    $st->bind_param("s", $foititis_username);
    $st->execute();
    $res = $st->get_result();
    if ($res->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'No thesis assignment found for this student']);
        exit;
    }
    $aRow = $res->fetch_assoc();
    $dipl_id = (int)$aRow['diplomatiki'];
    $imer_enarxis = $aRow['imerominia_enarxis'] ?? null;
    $imer_lixis   = $aRow['imerominia_lixis'] ?? null;
    $st->close();

    //info diplomatikis
    $sql = "SELECT titlos, epivlepontas, noumero1, noumero2, gs_anathesi FROM diplomatiki WHERE id = ?";
    $st = $conn->prepare($sql);
    if (!$st) throw new Exception($conn->error);
    $st->bind_param("i", $dipl_id);
    $st->execute();
    $dRow = $st->get_result()->fetch_assoc() ?: [];
    $st->close();

//to info apo tin exetasi
    $sql = "SELECT aithousa, imerominia, ora FROM exetasi WHERE diplomatiki = ?";
    $st = $conn->prepare($sql);
    if (!$st) throw new Exception($conn->error);
    $st->bind_param("i", $dipl_id);
    $st->execute();
    $eRow = $st->get_result()->fetch_assoc() ?: [];
    $st->close();

    //onoma kathigiton
    $profFields = ['epivlepontas','noumero1','noumero2'];
    $profData = [];
    foreach ($profFields as $pf) {
        $username = $dRow[$pf] ?? null;
        if (!$username) {
            $profData[$pf] = ['fullname' => '', 'profession' => ''];
            continue;
        }
        $sql = "SELECT onoma, eponimo, profession FROM kathigitis WHERE username = ? LIMIT 1";
        $st = $conn->prepare($sql);
        if (!$st) throw new Exception($conn->error);
        $st->bind_param("s", $username);
        $st->execute();
        $kRow = $st->get_result()->fetch_assoc() ?: null;
        $st->close();
        if ($kRow) {
            $profData[$pf] = [
                'fullname' => trim(($kRow['onoma'] ?? '') . ' ' . ($kRow['eponimo'] ?? '')),
                'profession' => $kRow['profession'] ?? ''
            ];
        } else {
            $profData[$pf] = ['fullname' => $username, 'profession' => ''];
        }
    }

    //onoma foititi
    $sql = "SELECT onoma, eponimo FROM foititis WHERE username = ? LIMIT 1";
    $st = $conn->prepare($sql);
    if ($st) {
        $st->bind_param("s", $foititis_username);
        $st->execute();
        $fRow = $st->get_result()->fetch_assoc() ?: [];
        $st->close();
    } else {
        $fRow = [];
    }
    $student_fullname = trim(($fRow['onoma'] ?? '') . ' ' . ($fRow['eponimo'] ?? ''));
    if ($student_fullname === '') $student_fullname = $foititis_username;

    //to average ton vathmon
    $sql = "SELECT COUNT(*) AS cnt,
                   CASE WHEN COUNT(*) = 0 THEN NULL
                        ELSE ROUND( SUM(
                              COALESCE(grade1,0)*0.6 + COALESCE(grade2,0)*0.15 + COALESCE(grade3,0)*0.15 + COALESCE(grade4,0)*0.1
                        ) / COUNT(*), 2)
                   END AS avg_total
            FROM diplomatiki_grades
            WHERE diplomatiki_id = ?";
    $st = $conn->prepare($sql);
    if (!$st) throw new Exception($conn->error);
    $st->bind_param("i", $dipl_id);
    $st->execute();
    $gRow = $st->get_result()->fetch_assoc() ?: ['cnt' => 0, 'avg_total' => null];
    $st->close();

    //build
    $out = [
        'student_fullname' => $student_fullname,
        'titlos' => $dRow['titlos'] ?? '',
        'gs_anathesi' => $dRow['gs_anathesi'] ?? null,
        'aithousa' => $eRow['aithousa'] ?? null,
        'imerominia' => $eRow['imerominia'] ?? null,
        'ora' => $eRow['ora'] ?? null,
        'epivlepontas' => $profData['epivlepontas'],
        'noumero1' => $profData['noumero1'],
        'noumero2' => $profData['noumero2'],
        'avg_total' => $gRow['avg_total'] === null ? null : (float)$gRow['avg_total']
    ];

    echo json_encode(['success' => true, 'data' => $out], JSON_UNESCAPED_UNICODE);

} catch (Exception $ex) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $ex->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}