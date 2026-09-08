# Delivery Sign Simulator

Hyper-realistic delivery signing simulation that runs entirely in the browser. Pick a service — courier package or food delivery — and work a full route the way a driver does:

1. Browse today's stops/orders (recipient, address, phone, tracking/order number, ETA)
2. Arrive at the stop
3. Have the customer **sign with a finger** on the touchscreen (typed name + drawn signature)
4. Snap a **proof-of-delivery photo** (camera or upload)
5. Mark the stop **delivered** and view the proof-of-delivery record

**Courier packages:** FedEx Ground, UPS, USPS, DHL Express, Amazon Logistics
**Food delivery:** DoorDash, Uber Eats, Pizza Hut, Domino's, Little Caesars

Food routes show the order like a real driver app: order number, items, total, payment method, and the pickup restaurant. Pizza brands use the classic "sign the receipt" flow; dasher routes offer hand-off or leave-at-door.

Some stops are driver release / contactless (leave at door, no signature), just like real routes.

**Custom recipients (presets):** on the home screen, open *Custom recipients* and add people ahead of time — name, phone, street address, delivery type (signature or leave-at-door), and an optional package/order description. They appear at the top of **every** route — courier and food — with their phone number shown, and when you arrive the stop screen shows who you're delivering to plus a tap-to-call link. Presets and completed stops persist in the browser.

## What it is

A simulation for fun and demonstration. Every brand look — wordmarks, colors, flows — is recreated from scratch in HTML/CSS. No logos, assets, or APIs are used, and **no data ever leaves the device**: signatures, photos, and delivery records are stored only in `localStorage` of the browser you use it in. There is no backend, no tracking, no collection.

- All orders, addresses, phones, and order numbers are fictional
- Courier timelines anchor "out for delivery" to today (or yesterday before 8:30 AM); food timelines follow a real order lifecycle (placed → confirmed → picked up → en route)
- Completed stops persist in the browser — use **Reset all** on the home screen to run the demo again
- Mobile-first: signing is built for touch, camera capture works from the phone
- Fully offline-capable: open `index.html` directly from disk — no server needed

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell, all views |
| `style.css` | Layout + per-brand themes (FedEx purple, UPS brown, USPS navy, DHL yellow, Amazon dark, DoorDash red, Uber black/green, pizza brands) |
| `app.js` | Brand/route data, flows, signature canvas, camera capture, localStorage records |
| `.github/workflows/pages.yml` | Deploys to GitHub Pages on push |

## Use it

Open the site on a phone, pick a brand, tap a stop, and follow the flow. To re-run a completed delivery: home screen → **Reset all**.

## Legal note

This is a simulation. It is not affiliated with, endorsed by, or connected to FedEx, UPS, the United States Postal Service, DHL, Amazon, DoorDash, Uber, Pizza Hut, Domino's, Little Caesars, or any other delivery carrier or restaurant. The small "simulation" footers are intentional. It collects nothing and stores nothing outside the browser it runs in.
