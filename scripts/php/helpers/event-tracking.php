<?php
declare(strict_types=1);

function loadEventConfiguration(): array
{
    static $events = null;

    if (is_array($events)) {
        return $events;
    }

    $path = dirname(__DIR__, 3) . '/config/events.json';
    $contents = file_get_contents($path);
    if ($contents === false) {
        throw new RuntimeException('Unable to read the event configuration.');
    }

    $decoded = json_decode($contents, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('The event configuration is invalid.');
    }

    $events = $decoded;
    return $events;
}

function getEventName(PDO $pdo, int $eventId): ?string
{
    $statement = $pdo->prepare(
        'SELECT event_name FROM event_lookup WHERE event_id = ? LIMIT 1'
    );
    $statement->execute([$eventId]);
    $eventName = $statement->fetchColumn();

    return is_string($eventName) && $eventName !== '' ? $eventName : null;
}

function getUsername(PDO $pdo, int $userId): ?string
{
    $statement = $pdo->prepare(
        'SELECT username FROM users WHERE user_id = ? LIMIT 1'
    );
    $statement->execute([$userId]);
    $username = $statement->fetchColumn();

    return is_string($username) && $username !== '' ? $username : null;
}

function getSpecificEventName(int $eventId, int $specificEventId): ?string
{
    $events = loadEventConfiguration();
    $eventKey = (string) $eventId;
    $specificKey = (string) $specificEventId;

    if (!isset($events[$eventKey][$specificKey])) {
        return null;
    }

    $name = $events[$eventKey][$specificKey];
    return is_string($name) && $name !== '' ? $name : null;
}

function getFullEventDescription(PDO $pdo, int $eventId, int $specificEventId): ?string
{
    $eventName = getEventName($pdo, $eventId);
    $specificEventName = getSpecificEventName($eventId, $specificEventId);

    if ($eventName === null || $specificEventName === null) {
        return null;
    }

    return $eventName . ' > ' . $specificEventName;
}

function logEvent(PDO $pdo, int $userId, int $eventId, int $specificEventId): int
{
    if ($userId < 1 || $eventId < 1 || $specificEventId < 1) {
        throw new InvalidArgumentException('Event IDs must be positive integers.');
    }

    $statement = $pdo->prepare('SELECT 1 FROM users WHERE user_id = ? LIMIT 1');
    $statement->execute([$userId]);
    if ($statement->fetchColumn() === false) {
        throw new InvalidArgumentException('The user does not exist.');
    }

    if (getEventName($pdo, $eventId) === null) {
        throw new InvalidArgumentException('The event category does not exist.');
    }

    if (getSpecificEventName($eventId, $specificEventId) === null) {
        throw new InvalidArgumentException('The specific event does not exist for this category.');
    }

    $statement = $pdo->prepare(
        'INSERT INTO user_activity_events (user_id, `event`, specific_event) VALUES (?, ?, ?)'
    );
    $statement->execute([$userId, $eventId, $specificEventId]);

    return (int) $pdo->lastInsertId();
}
