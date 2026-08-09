<?php
/**
 * HAULINJUNKIES Contact Form Processor
 * Handles form submission and image uploads using Mailgun SMTP
 */

// Test if script runs
file_put_contents(__DIR__ . '/test.txt', 'Script executed at ' . date('Y-m-d H:i:s'));

// Create custom debug log
$debug_log = __DIR__ . '/contact_debug.log';
function debug_log($message) {
    global $debug_log;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($debug_log, "[$timestamp] $message\n", FILE_APPEND | LOCK_EX);
}

debug_log("=== Contact form script started ===");
debug_log("Script location: " . __DIR__);
debug_log("Request method: " . $_SERVER['REQUEST_METHOD']);

// Include Composer autoloader
require_once 'vendor/autoload.php';

// Local secrets not committed to git (see config.local.php.example)
$mailgun_api_key = getenv('MAILGUN_API_KEY') ?: null;
if (!$mailgun_api_key && file_exists(__DIR__ . '/config.local.php')) {
    $mailgun_api_key = (include __DIR__ . '/config.local.php')['mailgun_api_key'] ?? null;
}

// Configuration
$config = [
    'upload_dir' => '/hlnjks/uploads/contact_images/', // Use absolute path
    'max_file_size' => 10 * 1024 * 1024, // 10MB
    'allowed_types' => ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    'allowed_extensions' => ['jpg', 'jpeg', 'png', 'gif'],
    'max_files' => 10,
    'email_to' => 'hello@haulinjunkies.com',
    'email_from' => 'noreply@haulinjunkies.com',
    'company_name' => 'HAULINJUNKIES',

    // Mailgun API Configuration
    'mailgun_api_key' => $mailgun_api_key,
    'mailgun_domain' => 'mg.haulinjunkies.com'
];

// Response array
$response = [
    'success' => false,
    'message' => '',
    'errors' => []
];

// Start session for CSRF protection (optional)
session_start();

try {
    if (!$mailgun_api_key) {
        throw new Exception('MAILGUN_API_KEY is not configured. Set the env var or create config.local.php from config.local.php.example.');
    }

    // Check if form was submitted
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method');
    } else {
        debug_log("No files found in \$_FILES['images'] or files array is empty");
        if (isset($_FILES)) {
            debug_log("Available \$_FILES keys: " . implode(', ', array_keys($_FILES)));
        } else {
            debug_log("\$_FILES is not set at all");
        }
    }

    // Sanitize and validate form data
    $form_data = [
        'name' => sanitize($_POST['name'] ?? ''),
        'email' => filter_var($_POST['email'] ?? '', FILTER_VALIDATE_EMAIL),
        'phone' => sanitize($_POST['phone'] ?? ''),
        'service' => sanitize($_POST['service'] ?? ''),
        'address_details' => sanitize($_POST['address_details'] ?? ''),
        'submission_time' => date('Y-m-d H:i:s'),
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
    ];

    // Validate required fields
    $validation_errors = [];
    
    if (empty($form_data['name'])) {
        $validation_errors[] = 'Name is required';
    }
    
    if (empty($form_data['email']) || !$form_data['email']) {
        $validation_errors[] = 'Valid email is required';
    }
    
    if (empty($form_data['phone'])) {
        $validation_errors[] = 'Phone number is required';
    }
    
    if (empty($form_data['address_details'])) {
        $validation_errors[] = 'Service address and details are required';
    }

    if (!empty($validation_errors)) {
        throw new Exception('Validation failed: ' . implode(', ', $validation_errors));
    }

    // Create upload directory if it doesn't exist
    $upload_path = $config['upload_dir']; // Use the absolute path directly
    
    // Fallback: if absolute path doesn't exist, try relative path
    if (!file_exists($upload_path)) {
        $relative_path = __DIR__ . '/uploads/contact_images/';
        if (file_exists(dirname($relative_path))) {
            $upload_path = $relative_path;
            error_log("Using relative path instead: " . $upload_path);
        }
    }
    
    if (!file_exists($upload_path)) {
        if (!mkdir($upload_path, 0755, true)) {
            throw new Exception('Failed to create upload directory: ' . $upload_path);
        }
    }
    
    debug_log("Final upload directory: " . $upload_path);

    // Debug: Log all POST and FILES data
    debug_log("POST data: " . print_r($_POST, true));
    debug_log("FILES data: " . print_r($_FILES, true));

    // Process uploaded images
    $uploaded_files = [];
    $upload_errors = [];

    if (isset($_FILES['images']) && !empty($_FILES['images']['name'][0])) {
        $file_count = count($_FILES['images']['name']);
        debug_log("Found {$file_count} files to process");
        
        if ($file_count > $config['max_files']) {
            throw new Exception("Too many files. Maximum {$config['max_files']} files allowed.");
        }

        for ($i = 0; $i < $file_count; $i++) {
            $file = [
                'name' => $_FILES['images']['name'][$i],
                'type' => $_FILES['images']['type'][$i],
                'tmp_name' => $_FILES['images']['tmp_name'][$i],
                'error' => $_FILES['images']['error'][$i],
                'size' => $_FILES['images']['size'][$i]
            ];

            debug_log("Processing file {$i}: " . print_r($file, true));
            debug_log("File name length: " . strlen($file['name']));
            debug_log("Temp file exists: " . (file_exists($file['tmp_name']) ? 'YES' : 'NO'));
            debug_log("Upload path writable: " . (is_writable($upload_path) ? 'YES' : 'NO'));

            // Skip empty files
            if ($file['error'] === UPLOAD_ERR_NO_FILE) {
                debug_log("Skipping empty file at index {$i}");
                continue;
            }

            // Check for upload errors
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $error_msg = "Error uploading {$file['name']}: " . getUploadErrorMessage($file['error']);
                $upload_errors[] = $error_msg;
                debug_log("Upload error: " . $error_msg . " (Error code: {$file['error']})");
                continue;
            }

            // Validate file
            $validation_result = validateFile($file, $config);
            if ($validation_result !== true) {
                $upload_errors[] = $validation_result;
                continue;
            }

            // Generate unique filename
            $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $new_filename = uniqid('contact_' . date('Ymd_His') . '_') . '.' . $file_extension;
            $destination = $upload_path . $new_filename;

            debug_log("Original filename: '{$file['name']}'");
            debug_log("File extension: '{$file_extension}'");
            debug_log("New filename: '{$new_filename}'");
            debug_log("Attempting to save file to: " . $destination);
            debug_log("move_uploaded_file from: '{$file['tmp_name']}' to: '{$destination}'");

            // Move uploaded file
            if (move_uploaded_file($file['tmp_name'], $destination)) {
                $uploaded_files[] = [
                    'original_name' => $file['name'],
                    'stored_name' => $new_filename,
                    'file_path' => $destination, // Use full absolute path
                    'file_size' => formatFileSize($file['size']),
                    'file_type' => $file['type']
                ];
                debug_log("File saved successfully: " . $destination);
                debug_log("File size after save: " . (file_exists($destination) ? filesize($destination) : 'FILE NOT FOUND'));
            } else {
                $upload_errors[] = "Failed to save {$file['name']}";
                debug_log("FAILED to save file: " . $file['name'] . " to " . $destination);
                debug_log("PHP last error: " . print_r(error_get_last(), true));
            }
        }
    }

    // Log the submission
    logSubmission($form_data, $uploaded_files, $upload_errors);

    // Send email notification
    $email_sent = sendEmailNotification($form_data, $uploaded_files, $config);
    
    if (!$email_sent) {
        throw new Exception('Failed to send email notification');
    }

    // Success response
    $response['success'] = true;
    $response['message'] = 'Thank you for contacting HAULINJUNKIES! We\'ve received your request and will get back to you soon with a free estimate.';
    
    if (!empty($uploaded_files)) {
        $response['message'] .= ' Your ' . count($uploaded_files) . ' image(s) have been uploaded successfully.';
    }
    
    if (!empty($upload_errors)) {
        $response['message'] .= ' Note: Some images had issues: ' . implode(', ', $upload_errors);
    }

} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = 'Error: ' . $e->getMessage();
    
    // Log error
    debug_log("Contact form error: " . $e->getMessage());
}

// Return JSON response for AJAX requests
if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}

// Redirect with message for regular form submissions
$redirect_url = ' contact_us.php';
if ($response['success']) {
    $redirect_url .= '?status=success&message=' . urlencode($response['message']);
} else {
    $redirect_url .= '?status=error&message=' . urlencode($response['message']);
}

header("Location: $redirect_url");
exit;

/**
 * Helper Functions
 */

function sanitize($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function validateFile($file, $config) {
    // Check file size
    if ($file['size'] > $config['max_file_size']) {
        return "File {$file['name']} is too large. Maximum size is " . formatFileSize($config['max_file_size']);
    }

    // Check file type
    if (!in_array($file['type'], $config['allowed_types'])) {
        return "File {$file['name']} has invalid type. Allowed types: " . implode(', ', $config['allowed_extensions']);
    }

    // Check file extension
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($file_extension, $config['allowed_extensions'])) {
        return "File {$file['name']} has invalid extension. Allowed: " . implode(', ', $config['allowed_extensions']);
    }

    // Additional security check
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime_type = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mime_type, $config['allowed_types'])) {
        return "File {$file['name']} appears to be invalid image format";
    }

    return true;
}

function getUploadErrorMessage($error_code) {
    switch ($error_code) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            return 'File is too large';
        case UPLOAD_ERR_PARTIAL:
            return 'File was only partially uploaded';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Missing temporary folder';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Failed to write file to disk';
        case UPLOAD_ERR_EXTENSION:
            return 'File upload stopped by extension';
        default:
            return 'Unknown upload error';
    }
}

function formatFileSize($bytes) {
    if ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}

function sendEmailNotification($form_data, $uploaded_files, $config) {
    // Mailgun API URL
    $mailgun_url = "https://api.mailgun.net/v3/{$config['mailgun_domain']}/messages";

    // Create email subject
    $subject = "New Contact Form Submission - {$config['company_name']}";
    
    // Create HTML email body
    $html_message = "
    <html>
    <head>
        <title>New Contact Form Submission</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #007bff; }
            .files { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
            .file-item { margin-bottom: 5px; }
        </style>
    </head>
    <body>
        <div class='header'>
            <h1>{$config['company_name']} - New Contact Form</h1>
        </div>
        <div class='content'>
            <div class='section'>
                <p><span class='label'>Name:</span> {$form_data['name']}</p>
                <p><span class='label'>Email:</span> {$form_data['email']}</p>
                <p><span class='label'>Phone:</span> {$form_data['phone']}</p>
                <p><span class='label'>Service:</span> {$form_data['service']}</p>
                <p><span class='label'>Submission Time:</span> {$form_data['submission_time']}</p>
                <p><span class='label'>IP Address:</span> {$form_data['ip_address']}</p>
            </div>
            
            <div class='section'>
                <p class='label'>Service Address & Details:</p>
                <p>" . nl2br(htmlspecialchars($form_data['address_details'])) . "</p>
            </div>";

    if (!empty($uploaded_files)) {
        $html_message .= "
            <div class='section'>
                <p class='label'>Uploaded Images (" . count($uploaded_files) . "):</p>
                <div class='files'>";
        
        foreach ($uploaded_files as $file) {
            $html_message .= "<div class='file-item'>📷 {$file['original_name']} ({$file['file_size']})</div>";
        }
        
        $html_message .= "
                </div>
                <p><em>Images are stored on the server and can be accessed through the admin panel.</em></p>
            </div>";
    }

    $html_message .= "
        </div>
    </body>
    </html>";

    // Create plain text version
    $text_message = "New Contact Form Submission - {$config['company_name']}\n\n";
    $text_message .= "Name: {$form_data['name']}\n";
    $text_message .= "Email: {$form_data['email']}\n";
    $text_message .= "Phone: {$form_data['phone']}\n";
    $text_message .= "Service: {$form_data['service']}\n";
    $text_message .= "Submission Time: {$form_data['submission_time']}\n";
    $text_message .= "IP Address: {$form_data['ip_address']}\n\n";
    $text_message .= "Service Address & Details:\n{$form_data['address_details']}\n\n";
    
    if (!empty($uploaded_files)) {
        $text_message .= "Uploaded Images (" . count($uploaded_files) . "):\n";
        foreach ($uploaded_files as $file) {
            $text_message .= "- {$file['original_name']} ({$file['file_size']})\n";
        }
        $text_message .= "\nImages are stored on the server and can be accessed through the admin panel.\n";
    }

    // Prepare POST data
    $post_data = [
        'from' => "{$config['company_name']} Contact Form <{$config['email_from']}>",
        'to' => $config['email_to'],
        'subject' => $subject,
        'text' => $text_message,
        'html' => $html_message,
        'h:Reply-To' => $form_data['email'],
        'o:tag' => 'contact-form',
        'o:tracking' => 'yes',
        'o:tracking-clicks' => 'yes',
        'o:tracking-opens' => 'yes'
    ];

    // Add file attachments if any
    if (!empty($uploaded_files)) {
        foreach ($uploaded_files as $index => $file) {
            $full_path = realpath($file['file_path']);
            debug_log("Attempting to attach file: " . $file['file_path'] . " (resolved: " . $full_path . ")");
            
            if ($full_path && file_exists($full_path)) {
                try {
                    $curl_file = new CURLFile(
                        $full_path,
                        $file['file_type'],
                        $file['original_name']
                    );
                    $post_data["attachment[{$index}]"] = $curl_file;
                    debug_log("Successfully added attachment: " . $file['original_name']);
                } catch (Exception $e) {
                    debug_log("Error creating CURLFile for {$file['original_name']}: " . $e->getMessage());
                }
            } else {
                debug_log("File not found or not readable: " . $file['file_path']);
            }
        }
    }

    // Initialize cURL
    $ch = curl_init();
    
    // Set cURL options
    curl_setopt_array($ch, [
        CURLOPT_URL => $mailgun_url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $post_data, // Changed from http_build_query to allow file uploads
        CURLOPT_USERPWD => "api:{$config['mailgun_api_key']}",
        CURLOPT_TIMEOUT => 60, // Increased timeout for file uploads
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3
    ]);

    // Execute cURL request
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    
    curl_close($ch);

    // Check for cURL errors
    if ($curl_error) {
        debug_log("Mailgun cURL Error: " . $curl_error);
        return false;
    }

    // Check HTTP response code
    if ($http_code >= 200 && $http_code < 300) {
        $response_data = json_decode($response, true);
        if ($response_data && isset($response_data['id'])) {
            debug_log("Email sent successfully via Mailgun API. Message ID: " . $response_data['id']);
            debug_log("Full response: " . $response);
            return true;
        } else {
            debug_log("Mailgun API: Unexpected response format: " . $response);
            return false;
        }
    } else {
        debug_log("Mailgun API Error: HTTP {$http_code} - Response: " . $response);
        return false;
    }
}

function logSubmission($form_data, $uploaded_files, $upload_errors) {
    // Create logs directory if it doesn't exist
    if (!file_exists('logs')) {
        mkdir('logs', 0755, true);
    }
    
    $log_data = [
        'timestamp' => date('Y-m-d H:i:s'),
        'form_data' => $form_data,
        'uploaded_files' => count($uploaded_files),
        'upload_errors' => $upload_errors,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
    ];

    $log_entry = date('Y-m-d H:i:s') . " - Contact form submission from {$form_data['email']}\n";
    $log_entry .= "Data: " . json_encode($log_data) . "\n\n";

    file_put_contents('logs/contact_submissions.log', $log_entry, FILE_APPEND | LOCK_EX);
}

?>