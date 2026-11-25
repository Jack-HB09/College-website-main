<?php
declare(strict_types=1);

header('Cache-Control: no-store');
require_once __DIR__ . '/../helpers/json-response.php';
require_once __DIR__ . '/../session-bootstrap.php';
require_once __DIR__ . '/../connection.php';
require_once __DIR__ . '/../helpers/event-tracking.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    sendJsonResponse([
        'success' => false,
        'message' => 'Only GET requests are supported.'
    ], 405);
    exit;
}

try {
    startAccountSession();
    $userId = filter_var(
        $_SESSION['user_id'] ?? null,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($userId === false) {
        sendJsonResponse([
            'success' => false,
            'message' => 'You must be signed in to view activity logs.'
        ], 401);
        exit;
    }

    $pdo = getDatabaseConnection();
    $statement = $pdo->prepare(
        'SELECT admin_access FROM users WHERE user_id = ? LIMIT 1'
    );
    $statement->execute([(int) $userId]);
    $adminAccess = $statement->fetchColumn();

    if ($adminAccess === false || (int) $adminAccess !== 1) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Access denied.'
        ], 403);
        exit;
    }

    $page = filter_input(
        INPUT_GET,
        'page',
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );
    $page = $page === false || $page === null ? 1 : (int) $page;

    $pageSize = filter_input(
        INPUT_GET,
        'page_size',
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );
    $pageSize = $pageSize === false || $pageSize === null ? 50 : (int) $pageSize;
    if (!in_array($pageSize, [25, 50, 100, 250], true)) {
        $pageSize = 50;
    }

    $username = isset($_GET['username']) && is_string($_GET['username'])
        ? trim((string) $_GET['username'])
        : '';
    if (strlen($username) > 100) {
        $username = substr($username, 0, 100);
    }

    $eventId = filter_input(
        INPUT_GET,
        'event',
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );
    $eventId = $eventId === false || $eventId === null ? null : (int) $eventId;

    $from = isset($_GET['from']) && is_string($_GET['from'])
        ? (string) $_GET['from']
        : '';
    $to = isset($_GET['to']) && is_string($_GET['to'])
        ? (string) $_GET['to']
        : '';

    $datePattern = '/^\d{4}-\d{2}-\d{2}$/';
    if ($from !== '' && preg_match($datePattern, $from) !== 1) {
        $from = '';
    } elseif ($from !== '') {
        [$year, $month, $day] = array_map('intval', explode('-', $from));
        if (!checkdate($month, $day, $year)) {
            $from = '';
        }
    }
    if ($to !== '' && preg_match($datePattern, $to) !== 1) {
        $to = '';
    } elseif ($to !== '') {
        [$year, $month, $day] = array_map('intval', explode('-', $to));
        if (!checkdate($month, $day, $year)) {
            $to = '';
        }
    }

    $conditions = [];
    $parameters = [];

    if ($username !== '') {
        $conditions[] = 'u.username LIKE ?';
        $parameters[] = '%' . $username . '%';
    }
    if ($eventId !== null) {
        $conditions[] = 'a.event = ?';
        $parameters[] = $eventId;
    }
    if ($from !== '') {
        $conditions[] = 'a.event_timestamp >= ?';
        $parameters[] = $from . ' 00:00:00';
    }
    if ($to !== '') {
        $conditions[] = 'a.event_timestamp <= ?';
        $parameters[] = $to . ' 23:59:59';
    }

    $whereSql = $conditions === [] ? '' : 'WHERE ' . implode(' AND ', $conditions);

    $countStatement = $pdo->prepare(
        'SELECT COUNT(*) '
        . 'FROM user_activity_events a '
        . 'LEFT JOIN users u ON u.user_id = a.user_id '
        . $whereSql
    );
    $countStatement->execute($parameters);
    $totalRecords = (int) $countStatement->fetchColumn();
    $totalPages = max(1, (int) ceil($totalRecords / $pageSize));
    $page = min($page, $totalPages);
    $offset = ($page - 1) * $pageSize;

    $queryParameters = $parameters;
    $queryParameters[] = $pageSize;
    $queryParameters[] = $offset;

    $statement = $pdo->prepare(
        'SELECT a.event_id, a.user_id, a.event, a.specific_event, '
        . 'a.event_timestamp, u.username '
        . 'FROM user_activity_events a '
        . 'LEFT JOIN users u ON u.user_id = a.user_id '
        . $whereSql
        . ' ORDER BY a.event_timestamp DESC, a.event_id DESC '
        . 'LIMIT ? OFFSET ?'
    );
    foreach ($queryParameters as $index => $value) {
        $statement->bindValue($index + 1, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $statement->execute();

    $records = [];
    foreach ($statement->fetchAll() as $row) {
        $rowEventId = (int) $row['event'];
        $rowSpecificEventId = (int) $row['specific_event'];
        $eventName = getEventName($pdo, $rowEventId) ?? 'Unknown Event';
        $specificEventName = getSpecificEventName($rowEventId, $rowSpecificEventId)
            ?? 'Unknown Specific Event';
        $timestamp = is_string($row['event_timestamp'])
            ? $row['event_timestamp']
            : '';
        $dateTimeParts = preg_split('/\s+/', trim($timestamp));

        $records[] = [
            'id' => (int) $row['event_id'],
            'username' => is_string($row['username']) && $row['username'] !== ''
                ? $row['username']
                : 'Deleted User',
            'event' => $eventName,
            'specific_event' => $specificEventName,
            'date' => $dateTimeParts[0] ?? '',
            'time' => $dateTimeParts[1] ?? '',
        ];
    }

    sendJsonResponse([
        'success' => true,
        'records' => $records,
        'pagination' => [
            'page' => $page,
            'page_size' => $pageSize,
            'total_records' => $totalRecords,
            'total_pages' => $totalPages,
        ],
    ]);
} catch (Throwable $error) {
    error_log('Unable to load administrator activity logs: ' . $error->getMessage());
    sendJsonResponse([
        'success' => false,
        'message' => 'Activity logs could not be loaded.'
    ], 500);
}
