<?php
//to authentication checker arxeio pou xrisimopoieitai se ola ta ipoloipa
if (session_status() === PHP_SESSION_NONE) session_start();

function is_ajax() {
    return (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
            strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')
           || (stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false);
}

function json_error($msg, $code = 401) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $msg]);
    exit;
}

function page_redirect_login() {
    header('Location: /HTML/login.html');
    exit;
}

// require_role_or_die: checkarei ean o user einai o sostos allios den epitrepei prosvasi

function require_role_or_die($allowedRoles) {
    if (!is_array($allowedRoles)) $allowedRoles = [$allowedRoles];
    $userRole = $_SESSION['role'] ?? null;
    if (!$userRole) {
        if (is_ajax()) json_error('Not authenticated', 401);
        page_redirect_login();
    }
    if (!in_array($userRole, $allowedRoles, true)) {
        if (is_ajax()) json_error('Forbidden', 403);
        //non-Ajax error
        http_response_code(403);
        echo '403 Forbidden';
        exit;
    }
}

// kai pithanos gia owner opou xreiazetai
function require_owner_or_roles($ownerUsername, $allowedRoles = []) {
    $username = $_SESSION['username'] ?? null;
    if (!$username) {
        if (is_ajax()) json_error('Not authenticated', 401);
        page_redirect_login();
    }
    $userRole = $_SESSION['role'] ?? null;
    if ($username === $ownerUsername) return; // owner OK
    if ($userRole && in_array($userRole, (array)$allowedRoles, true)) return;
    if (is_ajax()) json_error('Forbidden', 403);
    http_response_code(403);
    echo '403 Forbidden';
    exit;
}
