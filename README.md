# Package Delivery Simulator

Hyper-realistic package delivery signing simulation that runs entirely in the browser. Pick a carrier — FedEx Ground, UPS, USPS, DHL Express, or Amazon Logistics — and work a full delivery route the way a driver does:

1. Browse today's stops (recipient, address, tracking number, delivery window)
2. Arrive at a stop
3. Have the customer **sign with a finger** on the touchscreen (typed name + drawn signature)
4. Snap a **proof-of-delivery photo** (camera or upload)
5. Mark the stop **delivered** and view the proof-of-delivery record

Some stops are "driver release" (leave at door, no signature), just like real routes.

**Live demo:** https://jlaiii.github.io/package-delivery-sim/

## What it is

A simulation for fun and demonstration. Every carrier look — wordmarks, colors, flow — is recreated from scratch in HTML/CSS. No carrier logos, assets, or APIs are used, and **no data ever leaves the device**: signatures, photos, and delivery records are stored only in `localStorage` of the browser you use it in. There is no backend, no tracking, no collection.

- All packages, addresses, tracking numbers, and times are fictional
- "Out for delivery since 8:47 AM" is anchored to today (or yesterday before 8:30 AM) so the story always reads correctly
- Completed stops persist in the browser — use **Reset all** on the home screen to run the demo again
- Mobile-first: signing is built for touch, camera capture works from the phone

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell, all views |
| `style.css` | Layout + per-carrier themes (FedEx purple, UPS brown, USPS navy, DHL yellow, Amazon dark) |
| `app.js` | Carrier/route data, flows, signature canvas, camera capture, localStorage records |
| `.github/workflows/pages.yml` | Deploys to GitHub Pages on push |

## Use it

Open the site on a phone, pick a carrier, tap a stop, and follow the flow. To re-run a completed delivery: home screen → **Reset all**.

## Legal note

This is a simulation. It is not affiliated with, endorsed by, or connected to FedEx, UPS, the United States Postal Service, DHL, Amazon, or any delivery carrier. The small "simulation" footers are intentional.
