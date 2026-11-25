<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/event-tracking.php';

function assertEventSame($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message);
    }
}

$events = loadEventConfiguration();
assertEventSame('Login Successful', getSpecificEventName(1, 1), 'Login Successful should resolve.');
assertEventSame('Incorrect Password', getSpecificEventName(1, 3), 'Incorrect Password should resolve.');
assertEventSame('Account Created', getSpecificEventName(2, 1), 'Account Created should resolve.');
assertEventSame(null, getSpecificEventName(1, 999), 'Unknown specific events should resolve to null.');
assertEventSame(null, getSpecificEventName(999, 1), 'Unknown categories should resolve to null.');

echo "Event tracking helper tests passed.\n";
