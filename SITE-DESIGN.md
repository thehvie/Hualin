# Haulin Junkies — Site Design & Layout Guide

This document defines the standard structure, CSS, and code conventions for all neighborhood/location pages on haulinjunkies.com. Use it as the reference when creating or updating any location page.

---

## 1. Page Template — File Structure

Every location page follows this order:

```
1. DOCTYPE / <html> / <head>
   a. Meta tags (charset, viewport, title, description, keywords, robots, author, geo)
   b. Open Graph tags (og:type, og:url, og:title, og:description, og:image)
   c. Twitter card tags
   d. Canonical link
   e. Favicon
   f. CSS link tags (in this exact order — see Section 3)
   g. <style> block (page-level custom CSS — see Section 4)
   h. Google Analytics (gtag.js)
   i. Structured Data JSON-LD (LocalBusiness schema + FAQPage schema)
2. <body>
   a. PHP header include
   b. Booking Modal
   c. Hero Section
   d. Service Content Section (8-col main + 4-col sidebar layout)
   e. PHP footer include
   f. Scroll button widget
   g. JS script tags (in order — see Section 5)
   h. Custom JS block
```

---

## 2. CSS Link Tags (Head — Required Order)

```html
<link rel="stylesheet" href="assets/css/all.min.css" />
<link rel="stylesheet" href="assets/css/bootstrap.min.css" />
<link rel="stylesheet" href="assets/css/venobox.min.css" />
<link rel="stylesheet" href="assets/css/slick.css" />
<link rel="stylesheet" href="assets/css/scroll_button.css" />
<link rel="stylesheet" href="assets/css/custom_spacing.css" />
<link rel="stylesheet" href="assets/css/select2.min.css" />
<link rel="stylesheet" href="assets/css/animate.css" />
<link rel="stylesheet" href="assets/css/nice-select.css" />
<link rel="stylesheet" href="assets/css/range_slider.css" />
<link rel="stylesheet" href="assets/css/jQuery-plugin-progressbar.css" />
<link rel="stylesheet" href="assets/css/pointer.css" />
<link rel="stylesheet" href="assets/css/style.css" />
<link rel="stylesheet" href="assets/css/responsive.css" />
```

---

## 3. JS Script Tags (Before </body> — Required Order)

```html
<script src="assets/js/jquery-3.7.1.min.js"></script>
<script src="assets/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/Font-Awesome.js"></script>
<script src="assets/js/venobox.min.js"></script>
<script src="assets/js/slick.min.js"></script>
<script src="assets/js/jquery.waypoints.min.js"></script>
<script src="assets/js/jquery.countup.min.js"></script>
<script src="assets/js/scroll_button.js"></script>
<script src="assets/js/select2.min.js"></script>
<script src="assets/js/sticky_sidebar.js"></script>
<script src="assets/js/wow.min.js"></script>
<script src="assets/js/range_slider.js"></script>
<script src="assets/js/jquery.nice-select.min.js"></script>
<script src="assets/js/jquery.marquee.min.js"></script>
<script src="assets/js/jQuery-plugin-progressbar.js"></script>
<script src="assets/js/pointer.js"></script>
<script src="assets/js/script.js"></script>
```

---

## 4. Standard Page-Level CSS (`<style>` Block)

This exact CSS block should appear in every location page `<style>` tag. Keep it formatted (not minified) for maintainability.

```css
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
  background-color: rgba(0, 0, 0, 0.8);
}

.booking-modal-content {
  position: relative;
  background-color: #fefefe;
  margin: 2% auto;
  padding: 0;
  border: none;
  width: 90%;
  max-width: 1000px;
  height: 90%;
  border-radius: 10px;
  overflow: hidden;
}

.booking-modal-header {
  background-color: #f8f9fa;
  padding: 15px 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.booking-modal-title {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.booking-close {
  background: none;
  border: none;
  font-size: 28px;
  font-weight: bold;
  color: #aaa;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.booking-close:hover,
.booking-close:focus {
  color: #000;
  text-decoration: none;
}

.booking-modal-body {
  padding: 0;
  height: calc(100% - 70px);
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #2c3e50, #34495e);
  padding: 80px 0;
  color: white;
  text-align: center;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 20px;
}

.hero-subtitle {
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 30px;
}

.hero-features {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 30px;
}

.hero-feature {
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
}

/* Main Content */
.service-content {
  padding: 80px 0;
}

.content-section {
  margin-bottom: 60px;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  text-transform: uppercase;
  margin-bottom: 30px;
}

.section-text {
  font-size: 1.1rem;
  color: #666;
  line-height: 1.7;
  margin-bottom: 30px;
}

.response-time {
  color: #ff6b35;
  font-weight: 600;
}

/* Services List */
.services-list {
  list-style: none;
  padding: 0;
}

.services-list li {
  margin-bottom: 15px;
  font-size: 1.1rem;
  display: flex;
  align-items: flex-start;
}

.service-name {
  color: #ff6b35;
  font-weight: 600;
  margin-right: 8px;
  white-space: nowrap;
}

.service-description {
  color: #666;
}

/* Why Choose Us */
.why-choose-list {
  list-style: none;
  padding: 0;
}

.why-choose-list li {
  margin-bottom: 20px;
  font-size: 1.1rem;
}

.why-number {
  color: #ff6b35;
  font-weight: 600;
  margin-right: 8px;
}

.why-title {
  color: #ff6b35;
  font-weight: 600;
}

/* Service Locations */
.locations-list {
  list-style: none;
  padding: 0;
  columns: 2;
  column-gap: 40px;
}

.locations-list li {
  margin-bottom: 15px;
  font-size: 1.1rem;
  color: #666;
  break-inside: avoid;
}

.locations-list li::before {
  content: "•";
  color: #ff6b35;
  font-weight: bold;
  margin-right: 8px;
}

.locations-list li a {
  color: #555;
  text-decoration: none;
  transition: color 0.2s;
}

.locations-list li a:hover {
  color: #ff6b35;
  text-decoration: underline;
}

/* Service Areas */
.areas-list {
  list-style: none;
  padding: 0;
}

.areas-list li {
  margin-bottom: 15px;
  font-size: 1.1rem;
  color: #666;
}

.areas-list li::before {
  content: "•";
  color: #ff6b35;
  font-weight: bold;
  margin-right: 8px;
}

/* SEO Content Box */
.seo-content-box {
  background: white;
  border-radius: 15px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 2px solid #e9ecef;
  margin-bottom: 40px;
}

.seo-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.seo-feature {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.seo-feature-icon {
  background: #007bff;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 1.2rem;
}

.seo-feature-text {
  font-size: 0.95rem;
  color: #666;
  font-weight: 600;
}

/* Sidebar */
.sidebar {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 2px solid #e9ecef;
  position: sticky;
  top: 20px;
}

.sidebar-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 25px;
  text-transform: uppercase;
}

.sidebar-btn {
  display: block;
  width: 100%;
  padding: 15px;
  margin-bottom: 15px;
  background: linear-gradient(135deg, #ff6b35, #f7931e);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  text-transform: uppercase;
  text-align: center;
  transition: all 0.3s ease;
}

.sidebar-btn:hover {
  color: white;
  text-decoration: none;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 107, 53, 0.3);
}

.sidebar-btn.phone-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
}

.sidebar-btn.phone-btn:hover {
  box-shadow: 0 5px 15px rgba(0, 123, 255, 0.3);
}

.sidebar-section {
  margin-bottom: 30px;
}

.sidebar-section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 15px;
  text-transform: uppercase;
}

.sidebar-list {
  list-style: none;
  padding: 0;
}

.sidebar-list li {
  margin-bottom: 8px;
  font-size: 0.95rem;
  color: #666;
  display: flex;
  align-items: center;
}

.sidebar-list li::before {
  content: "✓";
  color: #28a745;
  font-weight: bold;
  margin-right: 8px;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1.1rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .locations-list {
    columns: 1;
  }

  .sidebar {
    margin-top: 40px;
  }

  .booking-modal-content {
    width: 95%;
    height: 95%;
    margin: 2.5% auto;
  }

  .hero-features {
    justify-content: center;
  }

  .seo-features {
    grid-template-columns: 1fr;
  }
}
```

---

## 5. Standard Custom JS Block

```html
<script>
  function openBookingModal() {
    document.getElementById("bookingModal").style.display = "block";
    document.body.style.overflow = "hidden";
  }

  function closeBookingModal() {
    document.getElementById("bookingModal").style.display = "none";
    document.body.style.overflow = "auto";
  }

  // Close modal when clicking outside of it
  window.onclick = function (event) {
    var modal = document.getElementById("bookingModal");
    if (event.target == modal) {
      closeBookingModal();
    }
  };

  // Close modal on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeBookingModal();
  });

  // Initialize WOW animations
  new WOW().init();
</script>
```

---

## 6. HTML Section Comments

Use these comment blocks around major sections for readability:

```html
<!--============================
    HERO SECTION START
=============================-->

<!--============================
    HERO SECTION END
=============================-->

<!--============================
    SERVICE CONTENT START
=============================-->

<!--============================
    SERVICE CONTENT END
=============================-->

<!--================================
    SCROLL BUTTON START
=================================-->

<!--================================
    SCROLL BUTTON END
=================================-->
```

---

## 7. Main Content Layout

The main body uses a **2-column Bootstrap grid** inside `.service-content`:

```
col-lg-8  →  Main article content (sections listed below)
col-lg-4  →  Sticky sidebar
```

### Main Column Sections (col-lg-8) — Standard Order

1. **Main Service Description** — 2 paragraphs about the location
2. **Same-Day Service** — response times, coverage zones
3. **Services We Provide** — `<ul class="services-list">` with `service-name` / `service-description` spans
4. **Why Choose Us** — `<ol class="why-choose-list">` with numbered items
5. **[Location-specific section]** — Extra content unique to the area
6. **Areas We Serve** — `<ul class="locations-list">` (2-column, links to sub-pages)
7. **Extended Service Areas** — `<ul class="areas-list">` for neighboring cities
8. **Community Section** — "A company that understands [location]"
9. **FAQ Section** — `<h3>` questions + `.section-text` answers

### Sidebar (col-lg-4)

```
- sidebar-title: "Get [Location] Service Now"
- Book button (opens booking modal)
- Call button: tel:4078154926
- sidebar-section: Coverage (checklist)
- sidebar-section: Services (checklist)
- sidebar-section: Why Choose Us (checklist)
```

---

## 8. Brand Colors

| Use | Color |
|-----|-------|
| Primary accent (CTAs, highlights) | `#ff6b35` |
| Secondary accent (phone button) | `#007bff` |
| Success / checkmarks | `#28a745` |
| Hero background | `linear-gradient(135deg, #2c3e50, #34495e)` — **same on all pages, no exceptions** |
| Body text | `#666` |
| Headings | `#333` |

---

## 9. Booking Widget

All pages use the same Workiz booking iframe:

```
https://online-booking.workiz.com/?ac=613f8b02898d8eaac0891a2f5cf72d8dadd3bcd94b2d1b5f685c168f67125dca
```

---

## 10. Phone Number

**(407) 815-4926** — `tel:4078154926`

---

## 11. Maitland Neighborhood Pages Inventory

| File | Neighborhood |
|------|--------------|
| maitland.php | Maitland (main) |
| maitland-downtown.php | Downtown Maitland |
| maitland-art-center.php | Maitland Art Center |
| maitland-center.php | Maitland Center |
| maitland-lake-maitland.php | Lake Maitland |
| maitland-lake-minnehaha.php | Lake Minnehaha |
| maitland-lake-sybelia.php | Lake Sybelia |
| maitland-dommerich-hills.php | Dommerich Hills |
| maitland-historic-district.php | Historic District |
| maitland-industrial-park.php | Maitland Industrial Park |
| maitland-boulevard.php | Maitland Boulevard |
| maitland-orlando-avenue.php | Orlando Avenue |
| maitland-avenue.php | Maitland Avenue |
| maitland-packwood-avenue.php | Packwood Avenue |
| maitland-bird-road.php | Bird Road |
| maitland-independence-lane.php | Independence Lane |
| maitland-forest-hills.php | Forest Hills |
