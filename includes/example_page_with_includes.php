<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>Haulin Junkies | Fast & Affordable Junk Removal in Orlando, FL</title>
    <meta name="description" content="Haulin Junkies offers fast, affordable junk removal services in Orlando and Central Florida. Residential & commercial cleanouts, appliance removal, and more. Call 407-815-4926 for a free quote!" />
    
    <!-- All your CSS links -->
    <link rel="icon" type="image/png" href="assets/images/favicon.png" />
    <link rel="stylesheet" href="assets/css/all.min.css" />
    <link rel="stylesheet" href="assets/css/bootstrap.min.css" />
    <link rel="stylesheet" href="assets/css/style.css" />
    <link rel="stylesheet" href="assets/css/responsive.css" />
    
    <!-- Custom Styles -->
    <style>
      /* Fix dropdown menu - remove scroll and show all services */
      .droap_menu {
        max-height: none !important;
        overflow: visible !important;
        height: auto !important;
      }
      
      .booking-modal {
        display: none;
        position: fixed;
        z-index: 9999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.8);
      }
      
      .booking-modal-content {
        position: relative;
        background-color: #fefefe;
        margin: 2% auto;
        padding: 0;
        width: 90%;
        max-width: 1000px;
        height: 90%;
        border-radius: 10px;
        overflow: hidden;
      }
      /* ... rest of your modal styles ... */
    </style>
  </head>

  <body>
    
    <!-- ========================================
         HEADER INCLUDE - Replaces entire topbar and menu section
         ======================================== -->
    <?php include 'includes/header.php'; ?>
    
    
    <!-- Booking Modal -->
    <div id="bookingModal" class="booking-modal">
      <div class="booking-modal-content">
        <div class="booking-modal-header">
          <h3 class="booking-modal-title">Book Your Junk Removal Service</h3>
          <button class="booking-close" onclick="closeBookingModal()">&times;</button>
        </div>
        <div class="booking-modal-body">
          <iframe src='https://online-booking.workiz.com/?ac=613f8b02898d8eaac0891a2f5cf72d8dadd3bcd94b2d1b5f685c168f67125dca' width="100%" height="700px" style='border:none;'></iframe>
        </div>
      </div>
    </div>


    <!--============================
        YOUR PAGE CONTENT GOES HERE
        (Banner, Services, About, etc.)
    =============================-->
    
    <section class="banner">
      <!-- Your banner content -->
    </section>
    
    <section class="services">
      <!-- Your services content -->
    </section>
    
    <!-- ... all your other page sections ... -->


    <!-- ========================================
         FOOTER INCLUDE - Replaces entire footer section
         ======================================== -->
    <?php include 'includes/footer.php'; ?>


    <!--================================
        SCROLL BUTTON START
    =================================-->
    <div class="progress-wrap">
      <svg
        class="progress-circle svg-content"
        width="100%"
        height="100%"
        viewBox="-1 -1 102 102"
      >
        <path d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" />
      </svg>
    </div>
    <!--================================
        SCROLL BUTTON END
    =================================-->

    <!--jquery library js-->
    <script src="assets/js/jquery-3.7.1.min.js"></script>
    <!--bootstrap js-->
    <script src="assets/js/bootstrap.bundle.min.js"></script>
    <!--font-awesome js-->
    <script src="assets/js/Font-Awesome.js"></script>
    <!-- ... all your other scripts ... -->
    <script src="assets/js/script.js"></script>

    <!-- Custom Modal JavaScript -->
    <script>
      function openBookingModal() {
        document.getElementById('bookingModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
      }

      function closeBookingModal() {
        document.getElementById('bookingModal').style.display = 'none';
        document.body.style.overflow = '';
      }

      window.onclick = function(event) {
        var modal = document.getElementById('bookingModal');
        if (event.target == modal) {
          closeBookingModal();
        }
      }

      document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
          closeBookingModal();
        }
      });
    </script>
  </body>
</html>
