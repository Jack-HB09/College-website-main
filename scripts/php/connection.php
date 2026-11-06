<?php 
// 2. Database configuration details
$host    = 'localhost';
$db      = '391848';
$user    = '391848';
$pass    = 'weave'; // move this to below www root in production
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Fetch associative arrays
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Use real prepared statements
];

$pdo = new PDO($dsn, $user, $pass, $options);