<!--============================
    TOPBAR START
=============================-->
<section class="topbar">
  <div class="container">
    <div class="row">
      <div class="col-xl-7 col-lg-6 d-none d-lg-block">
        <ul class="topbar_left d-flex flex-wrap">
          <li>
            <p>Haulin Junkies</p>
          </li>
          <li>
            <a href="tel:+14078154926">
              <span
                ><img
                  src="assets/images/call_icon_blue.svg"
                  alt="call"
                  class="img-fluid w-100"
              /></span>
              +1 407.815.4926</a
            >
          </li>
          <li>
            <a href="mailto:hello@haulinjunkies.com">
              <span
                ><img
                  src="assets/images/mail_icon_blue.svg"
                  alt="mail"
                  class="img-fluid w-100"
              /></span>
              hello@haulinjunkies.com</a
            >
          </li>
        </ul>
      </div>
      <div class="col-xl-5 col-lg-6">
        <div class="topbar_right d-flex flex-wrap">
          <select class="select_js header_language">
            <option value="">English</option>
          </select>
          <select class="select_js">
            <option value="">$USD</option>
        
          </select>
          <ul class="icon d-flex flex-wrap">
            <li>
              <a href="#"><i class="fab fa-facebook-f"></i></a>
            </li>
            </li>
            <li>
              <a href="#"><i class="fab fa-twitter"></i></a>
            </li>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>
<!--============================
    TOPBAR END
=============================-->

<!--============================
    MENU START
=============================-->
<nav class="navbar navbar-expand-lg main_menu">
  <div class="container">
    <a class="navbar-brand" href="index.php">
      <img
        src="assets/images/logo.png"
        alt="Haulin Junkies - Junk Removal Orlando"
        class="img-fluid w-100"
      />
    </a>
    <button
      class="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarSupportedContent"
      aria-controls="navbarSupportedContent"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <i class="far fa-stream menu_icon_bar"></i>
      <i class="far fa-times close_icon_close"></i>
    </button>
    <div class="collapse navbar-collapse" id="navbarSupportedContent">
      <ul class="navbar-nav m-auto">
        <li class="nav-item">
          <a class="nav-link active" href="index.php"
            >Home <i class="fas fa-chevron-down"></i
          ></a>
        </li>
         <!--
        <li class="nav-item">
          <a class="nav-link" href="   ">about</a>
        </li>
        --> 
        <li class="nav-item">
          <a class="nav-link" href="#"
            >services <i class="fas fa-chevron-down"></i
          ></a>
          <ul class="droap_menu">
            <li><a href="residential.php">Residential</a></li>
            <li><a href="commercial.php">Commercial</a></li>
            <li><a href="apartment-cleanouts.php">Apartment Cleanout services</a></li>
            <li><a href="appliance-removal.php">Appliance Removal </a></li>
            <li><a href="carpet-removal.php">Carpet Removal</a></li>
             <li><a href="concrete-removal.php">Concrete Removal</a></li>
            <li><a href="foreclosure-cleanout.php">Foreclosure cleanouts</a></li>
            <li><a href="hot-tub-removal.php">Hot Tub Removal</a></li>
            <li><a href="moving-services.php">Moving Help &amp; Delivery</a></li>
            <li><a href="senior-move-management.php">Senior Move Management</a></li>
            <li><a href="material-logistics.php">Material Logistics</a></li>
            <li><a href="cardboard-removal.php">Cardboard Removal</a></li>
             <li><a href="estate-cleanout.php">Estate Clean Outs</a></li>
             <li><a href="dumpster-rentals.php">Dumpster Rentals</a></li>
             <li><a href="orlando.php">Property Managers &amp; Realtors</a></li>
          </ul>
        </li>
        <!--
        <li class="nav-item">
          <a class="nav-link" href="#"
            >pages <i class="fas fa-chevron-down"></i
          ></a>
          <ul class="droap_menu">
            <li><a href="payment.php">Payment </a></li>
            <li><a href="faq.php">FAQs </a></li>
            <li><a href="provider.php">provider </a></li>
            <li><a href="provider_details.php">provider details </a></li>
            <li><a href="dashboard.php">dashboard </a></li>
            <li><a href="error.php">error </a></li>
            <li><a href="sign_in.php">sign in </a></li>
            <li><a href="sign_up.php">sign up </a></li>
            <li><a href="forgot_password.php">forgot password </a></li>
            <li><a href="privacy_policy.php">privacy Policy </a></li>
            <li><a href="terms_condition.php">terms and Condition </a></li>
          </ul>
        </li>
        -->
        <li class="nav-item">
          <a class="nav-link" href="junk-blog.php"
            >blog</a>
        </li>
        <li class="nav-item">
          <a class="nav-link active" href="service-areas.php">Service Areas</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="contact_us.php">Contact</a>
        </li>
      </ul>
      <ul class="right_menu d-flex flex-wrap">
        <li>
          <span class="search">
            <img
              src="assets/images/search_icon_white.svg"
              alt="search"
              class="img-fluid"
            />
          </span>
        </li>
        <li>
          <a class="hire_btn common_btn_2" href="#" onclick="openBookingModal(); return false;"
            >Book Now <i class="far fa-long-arrow-right"></i
          ></a>
        </li>
      </ul>
    </div>
  </div>
</nav>
<div class="menu_search">
  <form>
    <input type="text" placeholder="Search" />
    <button class="common_btn" type="submit">Search</button>
    <span class="close_search"><i class="far fa-times"></i></span>
  </form>
</div>
<!--============================
    MENU END
=============================-->

<!-- Custom Modal JavaScript -->
<script>
  function openBookingModal() {
    document.getElementById('bookingModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  function closeBookingModal() {
    document.getElementById('bookingModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
  }

  // Close modal when clicking outside of it
  window.onclick = function(event) {
    var modal = document.getElementById('bookingModal');
    if (event.target == modal) {
      closeBookingModal();
    }
  }

  // Close modal with Escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeBookingModal();
    }
  });
</script>
