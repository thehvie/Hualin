# Header & Footer Include Files - Setup Instructions

## What This Does
Instead of updating the menu and footer on every single page, you now have:
- **header.php** - Contains topbar and navigation menu
- **footer.php** - Contains footer section

Change these files ONCE, and all pages update automatically!

---

## 📁 File Structure

```
your-website/
├── includes/           # CREATE THIS FOLDER
│   ├── header.php
│   └── footer.php
├── index.php          # Renamed from index.html
├── estate_cleanout.php
├── apartment_cleanouts.php
└── ... (all other pages)
```

---

## 🚀 SETUP METHOD 1: PHP Includes (Recommended)

### Step 1: Create Includes Folder
1. Create a new folder called `includes` in your website root
2. Upload `header.php` to the `includes` folder
3. Upload `footer.php` to the `includes` folder

### Step 2: Rename Your HTML Files to PHP
- `index.html` → `index.php`
- `estate_cleanout.html` → `estate_cleanout.php`
- `apartment_cleanouts.html` → `apartment_cleanouts.php`
- etc.

**Note:** Your server must support PHP (most hosting providers do by default)

### Step 3: Replace Header Code in Each Page

**FIND THIS** (delete everything from TOPBAR START to MENU END):
```html
<!--============================
    TOPBAR START
=============================-->
<section class="topbar">
...
...
</nav>
<!--============================
    MENU END
=============================-->
```

**REPLACE WITH THIS** (single line):
```php
<?php include 'includes/header.php'; ?>
```

### Step 4: Replace Footer Code in Each Page

**FIND THIS** (delete everything from FOOTER START to FOOTER END):
```html
<!--============================
    FOOTER START
=============================-->
<footer class="mt_120 xs_mt_100 pt_75"...
...
<!--============================
    FOOTER END
=============================-->
```

**REPLACE WITH THIS** (single line):
```php
<?php include 'includes/footer.php'; ?>
```

### Step 5: Update Your .htaccess (Important!)

Add this to your `.htaccess` file so that `.html` URLs still work after renaming to `.php`:

```apache
# Redirect .html to .php
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)\.html$ /$1.php [L,R=301]
```

This ensures old links and bookmarks still work!

---

## 🌐 SETUP METHOD 2: Server Side Includes (SSI) - If You Can't Use PHP

### Step 1: Create Includes Folder
1. Create folder: `includes`
2. Save header as: `header.html` (not .php)
3. Save footer as: `footer.html` (not .php)

### Step 2: Enable SSI on Your Server

Add to `.htaccess`:
```apache
AddType text/html .shtml
AddOutputFilter INCLUDES .shtml
Options +Includes
```

### Step 3: Rename Files
- `index.html` → `index.shtml`
- `estate_cleanout.html` → `estate_cleanout.shtml`
- etc.

### Step 4: Replace Code with SSI

**Replace header with:**
```html
<!--#include virtual="/includes/header.html" -->
```

**Replace footer with:**
```html
<!--#include virtual="/includes/footer.html" -->
```

---

## 📝 Example Updated Page Structure

Here's what your `index.php` should look like after implementation:

```php
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Your Page Title</title>
    <!-- All your meta tags, CSS, etc. -->
    <style>
      /* Fix dropdown menu - remove scroll and show all services */
      .droap_menu {
        max-height: none !important;
        overflow: visible !important;
        height: auto !important;
      }
      /* Your other styles */
    </style>
  </head>

  <body>
    <?php include 'includes/header.php'; ?>

    <!-- YOUR PAGE CONTENT HERE -->
    <section class="banner">
      <!-- Your content -->
    </section>

    <?php include 'includes/footer.php'; ?>

    <!-- All your scripts -->
    <script src="assets/js/jquery-3.7.1.min.js"></script>
    <!-- etc. -->
  </body>
</html>
```

---

## ✅ What's Included in header.php

- Topbar with phone, email, language selector
- Full navigation menu with all services dropdown
- Search functionality
- Book Now button
- **Already has:** Dropdown scroll fix built-in
- **Email fixed:** Uses hello@haulinjunkies.com (no Cloudflare encoding)

## ✅ What's Included in footer.php

- Contact information
- Service links
- Quick links
- Working hours
- Social media icons
- Copyright notice
- Tidio chat widget script

---

## 🔄 How to Update Menu or Footer Site-Wide

### Before (had to update 15+ files):
1. Edit index.html menu
2. Edit estate_cleanout.html menu
3. Edit apartment_cleanouts.html menu
4. Edit 12+ more files...
😫 Takes forever!

### After (update once):
1. Edit `includes/header.php` ONLY
2. All pages update automatically!
✅ Done in 30 seconds!

---

## 🔧 Testing Your Setup

1. Upload the includes folder with both files
2. Rename one test page (like `contact_us.html` → `contact_us.php`)
3. Add the PHP includes to that page
4. Visit the page in your browser
5. If it works, update all other pages

**Things to Check:**
- ✅ Menu appears correctly
- ✅ All dropdown services visible (no scroll)
- ✅ Footer appears correctly
- ✅ Book Now modal works
- ✅ Phone/email links work

---

## 📋 Pages That Need Updating

Apply includes to ALL these pages:

- [ ] index.html → index.php
- [ ] estate_cleanout.html → estate_cleanout.php
- [ ] apartment_cleanouts.html → apartment_cleanouts.php
- [ ] residential.html → residential.php
- [ ] commercial.html → commercial.php
- [ ] appliance-removal.html → appliance-removal.php
- [ ] carpet-removal.html → carpet-removal.php
- [ ] concrete-removal.html → concrete-removal.php
- [ ] foreclosure-cleanout.html → foreclosure-cleanout.php
- [ ] hot-tub-removal.html → hot-tub-removal.php
- [ ] material-logistics.html → material-logistics.php
- [ ] cardboard-removal.html → cardboard-removal.php
- [ ] contact_us.html → contact_us.php
- [ ] junk-blog.html → junk-blog.php
- [ ] service-areas.html → service-areas.php
- [ ] Any other pages...

---

## ⚠️ Common Issues & Solutions

### Issue: "Page not found" after renaming to .php
**Solution:** Add the .htaccess redirect rule (see Step 5 above)

### Issue: Includes not showing
**Solution:** Check file paths. If includes folder is in root, use `includes/header.php`

### Issue: PHP code shows on page
**Solution:** Your server doesn't support PHP. Use SSI method instead or contact your host.

### Issue: Menu looks broken
**Solution:** Make sure all CSS files are still loading. Check browser console for errors.

---

## 💡 Pro Tips

1. **Always backup** your original files before making changes
2. **Test on one page first** before updating all pages
3. **Update navigation menu** by editing only `includes/header.php`
4. **Update footer** by editing only `includes/footer.php`
5. **Keep old HTML files** as backup until you're sure everything works

---

## 🎯 Benefits of This Setup

✅ Update menu once → changes on ALL pages
✅ Update footer once → changes on ALL pages
✅ No more tedious copy-paste across pages
✅ Easier to maintain
✅ Reduces errors
✅ Saves hours of work

---

## 📞 Need Help?

If you run into issues:
1. Check that your hosting supports PHP
2. Verify file paths are correct
3. Check browser console for errors
4. Contact your hosting provider if includes aren't working

---

## 🚀 Quick Start Checklist

- [ ] Create `includes` folder
- [ ] Upload `header.php` to includes folder
- [ ] Upload `footer.php` to includes folder
- [ ] Test on one page first (rename to .php, add includes)
- [ ] If successful, update all pages
- [ ] Add .htaccess redirect rule
- [ ] Test all pages
- [ ] Delete old HTML files (keep backups!)

---

**Ready to save hours of work? Let's get started!** 🎉
