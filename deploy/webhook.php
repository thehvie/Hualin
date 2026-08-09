<?php
/**
 * GitHub webhook receiver. On a push to main, triggers deploy.sh in the
 * background and returns immediately so GitHub doesn't time out.
 *
 * Configure the shared secret in deploy/webhook-secret.php (gitignored),
 * copied from deploy/webhook-secret.php.example. The same secret must be
 * entered in the GitHub webhook settings.
 */

$secretFile = __DIR__ . '/webhook-secret.php';
if (!file_exists($secretFile)) {
    http_response_code(500);
    exit('Webhook secret not configured.');
}

$secret = (include $secretFile)['secret'] ?? '';
if ($secret === '') {
    http_response_code(500);
    exit('Webhook secret empty.');
}

$payload = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

if ($signatureHeader === '') {
    http_response_code(400);
    exit('Missing signature.');
}

$expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
if (!hash_equals($expected, $signatureHeader)) {
    http_response_code(403);
    exit('Invalid signature.');
}

$data = json_decode($payload, true);
$ref = $data['ref'] ?? '';
if ($ref !== 'refs/heads/main') {
    http_response_code(200);
    exit('Ignored: not a push to main.');
}

$deployScript = escapeshellarg(__DIR__ . '/deploy.sh');
$logFile = escapeshellarg(__DIR__ . '/deploy.log');

// Run in the background so this request returns fast; output goes to deploy.log.
shell_exec("nohup bash $deployScript >> $logFile 2>&1 &");

http_response_code(200);
echo 'Deploy triggered.';
