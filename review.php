<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Leave Haulin Junkies a Review | Orlando Junk Removal</title>
    <meta name="description" content="Tell us how we did. Leave Haulin Junkies a quick Google review, or send Eric and Glenda private feedback so we can make it right." />
    <link rel="canonical" href="https://haulinjunkies.com/review.php" />

    <!-- Post-job funnel page, not a search landing page -->
    <meta name="robots" content="noindex, follow" />

    <link rel="icon" type="image/png" href="assets/images/favicon.png" />
    <link rel="stylesheet" href="assets/css/all.min.css" />
    <link rel="stylesheet" href="assets/css/bootstrap.min.css" />
    <link rel="stylesheet" href="assets/css/animate.css" />
    <link rel="stylesheet" href="assets/css/scroll_button.css" />
    <link rel="stylesheet" href="assets/css/style.css" />
    <link rel="stylesheet" href="assets/css/responsive.css" />

    <style>
      /* ============ EDIT THIS ONE LINE ============
         Paste your Google review short link from the Business Profile
         ("Ask for reviews" / "Get more reviews" -> Share review form).
         It looks like: https://g.page/r/CxxxxxxxxxxxxxEAI/review
         Until it's set, the button falls back to a Maps search for the profile. */
      /* ============================================ */

      .rv-wrap { max-width: 620px; margin: 0 auto; padding: 56px 20px 72px; }
      .rv-wrap h1 {
        font-size: 1.9rem; line-height: 1.25; text-align: center;
        color: #1f2937; margin: 0 0 10px;
      }
      .rv-sub { text-align:center; color:#6b7280; font-size:1.02rem; margin:0 auto 30px; max-width: 460px; }

      .rv-stars { display:flex; justify-content:center; gap:8px; margin: 0 0 34px; }
      .rv-stars button {
        background:none; border:none; cursor:pointer; padding:4px;
        font-size: 2.4rem; line-height:1; color:#d1d5db;
        transition: color .12s ease, transform .12s ease;
      }
      .rv-stars button:hover, .rv-stars button.on { color:#ffb400; }
      .rv-stars button:active { transform: scale(.9); }

      .rv-card {
        border:1px solid #e5e7eb; border-radius:14px; padding:26px 24px;
        margin-bottom:18px; background:#fff;
      }
      .rv-card h2 { font-size:1.15rem; color:#1f2937; margin:0 0 8px; }
      .rv-card p { color:#6b7280; font-size:.97rem; margin:0 0 18px; }

      .rv-btn {
        display:block; width:100%; text-align:center; text-decoration:none;
        padding:16px 20px; border-radius:10px; font-weight:700; font-size:1.05rem;
        border:2px solid transparent;
      }
      .rv-btn-google { background:#ff6b35; color:#fff; }
      .rv-btn-google:hover { background:#e85a26; color:#fff; }
      .rv-btn-private { background:#fff; color:#374151; border-color:#d1d5db; }
      .rv-btn-private:hover { border-color:#9ca3af; color:#111827; }

      .rv-card.pulse { border-color:#ff6b35; box-shadow:0 0 0 4px rgba(255,107,53,.12); }

      .rv-call { text-align:center; margin-top:26px; color:#6b7280; font-size:.95rem; }
      .rv-call a { color:#ff6b35; font-weight:700; text-decoration:none; }

      @media (max-width:480px){
        .rv-wrap h1 { font-size:1.55rem; }
        .rv-stars button { font-size:2rem; }
      }
    </style>
  </head>

  <body>

<?php include 'includes/header.php'; ?>

    <section class="rv-section">
      <div class="rv-wrap">
        <h1>How did we do?</h1>
        <p class="rv-sub">
          Haulin Junkies is a family business. Thirty seconds of your time
          genuinely helps us &mdash; thank you.
        </p>

        <div class="rv-stars" id="rvStars" aria-label="Rate your experience">
          <button type="button" data-v="1" aria-label="1 star">&#9733;</button>
          <button type="button" data-v="2" aria-label="2 stars">&#9733;</button>
          <button type="button" data-v="3" aria-label="3 stars">&#9733;</button>
          <button type="button" data-v="4" aria-label="4 stars">&#9733;</button>
          <button type="button" data-v="5" aria-label="5 stars">&#9733;</button>
        </div>

        <div class="rv-card" id="rvGoogle">
          <h2>Had a good experience?</h2>
          <p>A Google review is the single biggest help you can give a small
             local crew. It takes about a minute.</p>
          <a class="rv-btn rv-btn-google" id="rvGoogleBtn"
             href="https://www.google.com/maps/search/?api=1&amp;query=Haulin+Junkies+Maitland+FL"
             target="_blank" rel="noopener">
            Leave a Google review
          </a>
        </div>

        <div class="rv-card" id="rvPrivate">
          <h2>Something we could have done better?</h2>
          <p>Tell us directly. Eric &amp; Glenda read every message and will
             work to make it right.</p>
          <a class="rv-btn rv-btn-private" href="contact_us.php?ref=review">
            Send private feedback
          </a>
        </div>

        <p class="rv-call">
          Prefer to talk? Call or text <a href="tel:+14078154926">(407)&nbsp;815-4926</a>.
        </p>
      </div>
    </section>

<?php include 'includes/footer.php'; ?>

    <div class="progress-wrap">
      <svg class="progress-circle svg-content" width="100%" height="100%" viewBox="-1 -1 102 102">
        <path d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98" />
      </svg>
    </div>

    <script src="assets/js/jquery-3.7.1.min.js"></script>
    <script src="assets/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/Font-Awesome.js"></script>
    <script src="assets/js/scroll_button.js"></script>
    <script src="assets/js/script.js"></script>

    <script>
      (function () {
        // ==== Paste your Google review short link here ====
        var GOOGLE_REVIEW_URL = ""; // e.g. "https://g.page/r/CxxxxxxxxxxxxxEAI/review"
        // =================================================

        if (GOOGLE_REVIEW_URL) {
          document.getElementById("rvGoogleBtn").setAttribute("href", GOOGLE_REVIEW_URL);
        }

        // Stars are a friendly nudge only. Both options stay visible either way
        // (no review gating) — clicking just emphasises the likely next step.
        var stars = document.querySelectorAll("#rvStars button");
        var gCard = document.getElementById("rvGoogle");
        var pCard = document.getElementById("rvPrivate");

        stars.forEach(function (btn) {
          btn.addEventListener("click", function () {
            var v = parseInt(btn.getAttribute("data-v"), 10);
            stars.forEach(function (b, i) { b.classList.toggle("on", i < v); });
            gCard.classList.toggle("pulse", v >= 4);
            pCard.classList.toggle("pulse", v <= 3);
            var target = v >= 4 ? gCard : pCard;
            target.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        });
      })();
    </script>
  </body>
</html>
