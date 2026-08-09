<?php header("HTTP/1.1 404 Not Found"); ?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Not Found | Haulin Junkies</title>
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="https://haulinjunkies.com/" />
    <link rel="icon" type="image/png" href="assets/images/favicon.png" />
    <link rel="stylesheet" href="assets/css/all.min.css" />
    <link rel="stylesheet" href="assets/css/bootstrap.min.css" />
    <link rel="stylesheet" href="assets/css/style.css" />
    <link rel="stylesheet" href="assets/css/responsive.css" />
    <style>
      .error_page {
        min-height: 60vh;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 80px 20px;
      }
      .error_page h1 {
        font-size: 120px;
        font-weight: 800;
        color: #0d6efd;
        line-height: 1;
        margin-bottom: 10px;
      }
      .error_page h2 {
        font-size: 32px;
        margin-bottom: 16px;
      }
      .error_page p {
        font-size: 16px;
        color: #666;
        max-width: 500px;
        margin: 0 auto 30px;
      }
    </style>
  </head>
  <body>
    <?php include 'includes/header.php'; ?>

    <section class="error_page">
      <div>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for has moved or doesn't exist. Let us haul you back to safety.</p>
        <a href="/" class="common_btn">Go Back Home <i class="far fa-long-arrow-right"></i></a>
      </div>
    </section>

    <?php include 'includes/footer.php'; ?>

    <script src="assets/js/jquery-3.6.0.min.js"></script>
    <script src="assets/js/bootstrap.bundle.min.js"></script>
  </body>
</html>
