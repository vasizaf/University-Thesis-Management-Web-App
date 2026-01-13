<?php
include('database.php');

//ta filters pou theloume
$min_date = $_GET['min_date'] ?? '';
$max_date = $_GET['max_date'] ?? '';
$author = $_GET['author'] ?? '';
$format = $_GET['format'] ?? 'json';
$format = in_array($format, ['json','xml']) ? $format : 'json';


$where = [];
$params = [];
$types = '';

//kanoume panta join gia na paroume ola to data
$joinExetasi = ($min_date || $max_date);
if ($joinExetasi) {
        $sql = "SELECT a.diplomatiki_id, a.author, a.content, a.updated_at, d.titlos, e.imerominia, f.onoma AS student_onoma, f.eponimo AS student_epwnymo
                        FROM announcements a
                        JOIN diplomatiki d ON a.diplomatiki_id = d.id
                        JOIN analamvanei an ON an.diplomatiki = d.id
                        JOIN foititis f ON an.foititis = f.username
                        JOIN exetasi e ON e.diplomatiki = a.diplomatiki_id";
        if ($min_date) { $where[] = 'e.imerominia >= ?'; $params[] = $min_date; $types .= 's'; }
        if ($max_date) { $where[] = 'e.imerominia <= ?'; $params[] = $max_date; $types .= 's'; }
} else {
        $sql = "SELECT a.diplomatiki_id, a.author, a.content, a.updated_at, d.titlos, f.onoma AS student_onoma, f.eponimo AS student_epwnymo
                        FROM announcements a
                        JOIN diplomatiki d ON a.diplomatiki_id = d.id
                        JOIN analamvanei an ON an.diplomatiki = d.id
                        JOIN foititis f ON an.foititis = f.username";
}
if ($author) { $where[] = 'a.author = ?'; $params[] = $author; $types .= 's'; }
if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
$sql .= $joinExetasi ? ' ORDER BY e.imerominia DESC' : ' ORDER BY a.updated_at DESC';

$stmt = $conn->prepare($sql);
if ($params) $stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$data = [];
while ($row = $res->fetch_assoc()) $data[] = $row;

header('Content-Type: application/json; charset=utf-8');
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
