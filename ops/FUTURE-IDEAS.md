# Haulin-ops: Future Ideas (parked, not scheduled)

## Current AI scope
AI is for **customer communications only**, via **Twilio (SMS)** and **email**. Everything below is parked for later.

---

## Photo/video load estimation (researched 2026-09-30)

Inspired by LiveSwitch (liveswitch.com/features), a video-first tool for home-service companies. Only the public features page was reviewed; no pricing or hands-on testing.

### Features worth borrowing (easiest first)
| Feature | Effort | Notes |
|---|---|---|
| Customer photo/video upload link (web form / QR) | Low | Extends online booking; `JobAttachment` already exists |
| Reminders for customers who haven't uploaded | Low | Reuses existing text/email sending |
| Tags, search, timeline on job files | Low-Med | UI on top of `JobAttachment` |
| Checklists with photo proof (before/after) | Medium | New model; helps with damage disputes |
| Photo annotation | Medium | Canvas overlay |
| AI estimate from photos | Medium | Claude vision, human-reviewed suggestion only |
| Live video calls | High | WebRTC/TURN or Twilio Video/Daily. Defer; async covers most value |

### How AI estimation works and its limits
- Vision model identifies visible items, uses typical sizes/weights, gets scale from references (doorways, appliances, tape measure), converts pile footprint x height to cubic yards, then applies material density for weight.
- Hidden or piled items stay unknown. Return a **range**, list assumptions and unknowns, and ask the customer follow-up questions.
- Volume is fair from photos; **weight is weaker** (depends on box contents and materials).
- Never auto-send a binding price. Office reviews and edits.
- Store the AI range next to the actual final load on every job, to tune density tables and measure accuracy per tenant.
- Unverified: accuracy has not been tested on real job photos.

### Gaussian splatting (evaluated, not recommended first)
- 5-10 photos is too few; splatting needs ~50-200+ overlapping views or a slow walk-around video.
- No real-world scale without a reference (marker, tape, ARKit/LiDAR).
- A splat is a rendering format, not a volume. It needs conversion to a mesh/depth map, which is error-prone on cluttered piles.
- Slow and GPU-costly, and it does not solve occlusion.
- Better: 30-60 sec walk-around video, iPhone LiDAR/ARKit scan, or feed-forward reconstruction (DUSt3R / MASt3R / VGGT, research-grade). Vision-model range estimate is the cheap fallback.

### iPhone build-out
- Browsers (Safari iOS) cannot access LiDAR or depth. Precise capture needs native iOS code.
- LiDAR only on Pro models (12 Pro and newer). ARKit gives metric scale on most modern iPhones without LiDAR.
- Options: web upload (any phone, no scale) -> App Clip or small native ARKit app (no install needed via QR/text link; needs Apple developer account, ~15 MB limit, verify current limits) -> LiDAR scene mesh on Pro models.

### Roadmap
1. **Phase 1 (2-4 wks):** web upload link with guided prompts (corners, open closets, scale reference) + Claude range estimate + office edits. Save AI range vs actual load.
2. **Phase 2 (2-4 wks, parallel):** scan 10-20 real jobs with LiDAR, compare to actual loads. If Phase 1 is within ~15-20%, Phase 3 may not be needed.
3. **Phase 3 (6-10 wks):** Swift app / App Clip with ARKit, mesh upload, server-side volume calc, video fallback for non-LiDAR phones. Needs iOS skills.
4. **Phase 4:** per-tenant density tables and storage limits, accuracy reports, scan access as a paid plan tier, Android via ARCore.

### Risks
- Storage/bandwidth cost of video (per-tenant limits needed).
- Privacy of in-home photos (retention policy, short consent line).
- App Store review if a full app is built instead of an App Clip.
- Hidden items never go away; keep ranges and follow-up questions.
