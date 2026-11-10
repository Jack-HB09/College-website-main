<?php
declare(strict_types=1);

function startAccountSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    if (headers_sent($file, $line)) {
        throw new RuntimeException("Cannot start a session after output began at {$file}:{$line}.");
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    if (!session_start()) {
        throw new RuntimeException('Unable to start the account session.');
    }
}
