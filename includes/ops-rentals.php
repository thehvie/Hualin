<?php
// Live dumpster prices and availability from the ops system's price book and fleet.
// Needs 'ops_base_url' and 'ops_company_id' in config.local.php (or OPS_BASE_URL / OPS_COMPANY_ID env vars).
// Any failure returns null and the page shows its static content, so the site never depends on ops being up.

function ops_rentals_config() {
    $base = getenv('OPS_BASE_URL');
    $id = getenv('OPS_COMPANY_ID');
    if ((!$base || !$id) && file_exists(__DIR__ . '/../config.local.php')) {
        $c = include __DIR__ . '/../config.local.php';
        $base = $base ?: ($c['ops_base_url'] ?? null);
        $id = $id ?: ($c['ops_company_id'] ?? null);
    }
    return ($base && $id) ? [rtrim($base, '/'), $id] : null;
}

/** Packages keyed by lowercased size category ("12 yd"), or null if ops can't be reached. Cached 5 minutes. */
function ops_rentals() {
    static $memo = false;
    if ($memo !== false) return $memo;
    $memo = null;
    $cfg = ops_rentals_config();
    if (!$cfg) return null;

    $cache = sys_get_temp_dir() . '/haulin-ops-rentals-' . md5($cfg[1]) . '.json';
    $json = (file_exists($cache) && time() - filemtime($cache) < 300) ? file_get_contents($cache) : false;
    if ($json === false) {
        $ctx = stream_context_create(['http' => ['timeout' => 2, 'ignore_errors' => true]]);
        $json = @file_get_contents($cfg[0] . '/api/public/rentals/' . rawurlencode($cfg[1]), false, $ctx);
        if ($json === false || strpos($http_response_header[0] ?? '', '200') === false) {
            // Serve a stale copy rather than nothing.
            $json = file_exists($cache) ? file_get_contents($cache) : false;
        } else {
            @file_put_contents($cache, $json);
        }
    }
    $data = $json ? json_decode($json, true) : null;
    if (!is_array($data) || !isset($data['packages'])) return null;

    $out = [];
    foreach ($data['packages'] as $p) {
        if (!empty($p['category'])) $out[strtolower(trim($p['category']))] = $p;
    }
    return $memo = $out;
}

/** Card pieces for one size, e.g. ops_card('12 yd'): ['price' => '$400', 'note' => '3 days, 4 tons included', 'badge' => 'Available tomorrow'] or null. */
function ops_card($category) {
    $all = ops_rentals();
    $p = $all[strtolower($category)] ?? null;
    if (!$p || empty($p['priceCents'])) return null;
    $price = '$' . number_format($p['priceCents'] / 100, $p['priceCents'] % 100 ? 2 : 0);
    $note = [];
    if (!empty($p['packageDays'])) $note[] = $p['packageDays'] . ' days';
    if (!empty($p['includedTons'])) $note[] = rtrim(rtrim(number_format($p['includedTons'], 1), '0'), '.') . ' tons included';
    $badge = null;
    if ($p['available'] === true) $badge = 'Available for delivery tomorrow';
    elseif ($p['available'] === false) $badge = $p['nextAvailable'] ? 'Next available ' . date('M j', strtotime($p['nextAvailable'])) : 'Call for availability';
    return ['price' => $price, 'note' => implode(', ', $note), 'badge' => $badge, 'available' => $p['available']];
}

/** The price block for a size card: live price and availability from ops, or $fallback (the static markup) if ops has none. */
function ops_price_html($category, $fallback) {
    $c = ops_card($category);
    if (!$c) return $fallback;
    $h = '<div class="dumpster-price">' . htmlspecialchars($c['price']);
    if ($c['note']) $h .= '<span>' . htmlspecialchars($c['note']) . '</span>';
    $h .= '</div>';
    if ($c['badge']) {
        $color = $c['available'] === true ? '#1e8e3e' : '#b45309';
        $h .= '<div style="font-size:.85rem;font-weight:600;color:' . $color . ';margin:6px 0 12px;"><i class="fas fa-circle" style="font-size:.5rem;vertical-align:middle;"></i> ' . htmlspecialchars($c['badge']) . '</div>';
    }
    return $h;
}
