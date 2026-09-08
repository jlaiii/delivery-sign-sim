'use strict';
/* Package Delivery Simulator — all client-side, nothing leaves the device. */

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const pad2 = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = d => { let h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + pad2(d.getMinutes()) + ' ' + ap; };
const fmtDate = d => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const atDay = (d, off, h, m) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + off, h, m);

function show(viewId) {
  $$('.view').forEach(v => v.hidden = v.id !== viewId);
  window.scrollTo(0, 0);
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.hidden = true, 2600);
}

/* ================= storage ================= */
const KEY = 'pds.sim.v1';
function loadState() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* quota — handled by caller */ } }
const state = loadState();

/* ================= carrier data ================= */
/* Route day: today when it is at least 8:30 AM, otherwise yesterday — so the
   "out for delivery since 8:47 AM" story always holds. */
const now = new Date();
const routeDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getHours() * 60 + now.getMinutes() < 510 ? 1 : 0));
const ROUTE_START = atDay(routeDay, 0, 8, 47);

const CARRIERS = {
  fedex: {
    id: 'fedex', brand: 'FedEx Ground', wm: '<span class="wm-fedex">Fed<span class="ex">Ex</span></span>',
    sub: 'GROUND · DRIVER', cls: 'fedex',
    svcTag: '4 stops', routeName: 'FedEx Ground', releaseLabel: 'Driver release',
    legal: 'By continuing, you confirm the recipient accepted the package. Signature confirms receipt in good condition.',
    origin: 'HOUSTON, TX', hub: 'BROWNSVILLE, TX',
    stops: [
      { n: 'Michael Garza', a: '2140 Palm Blvd', c: 'Brownsville, TX 78520', svc: 'FedEx Ground', w: '9.4 lb', trk: '9611 0233 4455 6677 8899 00', mode: 'sig', note: 'Customer requested signature. Call box not available — knock.' },
      { n: 'Jay Alvarez', a: '1480 San Jacinto Blvd', c: 'Brownsville, TX 78520', svc: 'FedEx Express Saver', w: '3.2 lb', trk: '7712 4567 8901', mode: 'sig', note: null },
      { n: 'Rosa Trevino', a: '127 E Levee St', c: 'Brownsville, TX 78520', svc: 'FedEx Ground', w: '6.8 lb', trk: '9611 0233 9988 7766 5544 33', mode: 'sig', note: null },
      { n: 'Karen Martinez', a: '512 Southmost Rd', c: 'Brownsville, TX 78521', svc: 'FedEx Home Delivery', w: '12.1 lb', trk: '7712 9898 1234', mode: 'release', note: 'Leave at front door, out of the sun.' }
    ]
  },
  ups: {
    id: 'ups', brand: 'UPS', wm: '<span class="wm-ups">UPS</span>', sub: 'DRIVER ROUTE', cls: 'ups',
    svcTag: '4 stops', routeName: 'UPS Delivery', releaseLabel: 'Driver release',
    legal: 'By continuing, you confirm the recipient accepted the package. Signature confirms receipt in good condition.',
    origin: 'LOUISVILLE, KY', hub: 'BROWNSVILLE, TX',
    stops: [
      { n: 'Luis Ramirez', a: '802 Alton Gloor Blvd', c: 'Brownsville, TX 78526', svc: 'UPS Ground', w: '12.7 lb', trk: '1Z999AA10123456784', mode: 'sig', note: 'Signature required — customer requested over-the-counter.' },
      { n: 'Sofia Gonzalez', a: '342 Paredes Line Rd', c: 'Brownsville, TX 78521', svc: 'UPS Ground', w: '5.3 lb', trk: '1Z12345E0392128765', mode: 'sig', note: null },
      { n: 'Carlos Flores', a: '91 Central Blvd', c: 'Brownsville, TX 78520', svc: 'UPS Next Day Air', w: '2.1 lb', trk: '1Z876F1W0392456789', mode: 'sig', note: 'High value — do not release without signature.' },
      { n: 'Melissa Cantu', a: '2600 Old Port Isabel Rd', c: 'Brownsville, TX 78521', svc: 'UPS Ground', w: '8.9 lb', trk: '1Z45E2F80391234567', mode: 'release', note: 'Driver release. Leave at front door.' }
    ]
  },
  usps: {
    id: 'usps', brand: 'USPS', wm: '<span class="wm-usps"><span class="u1">UNITED STATES</span><span class="u2">POSTAL<i> SERVICE</i></span></span>',
    sub: 'CARRIER · PARCELS', cls: 'usps',
    svcTag: '4 stops', routeName: 'USPS Carrier Route', releaseLabel: 'No signature required',
    legal: 'By continuing, you confirm the recipient accepted the package. Signature confirms receipt in good condition.',
    origin: 'HOUSTON, TX', hub: 'BROWNSVILLE, TX',
    stops: [
      { n: 'Daniel Salinas', a: '675 W Price Rd', c: 'Brownsville, TX 78520', svc: 'Priority Mail', w: '4.6 lb', trk: '9400 1118 9922 3196 8877 65', mode: 'sig', note: 'Signature Confirmation service.' },
      { n: 'Alma Cantu', a: '1900 Boca Chica Blvd', c: 'Brownsville, TX 78521', svc: 'Priority Mail', w: '2.9 lb', trk: '9400 1099 2100 4455 6677 88', mode: 'sig', note: null },
      { n: 'Norma Castillo', a: '455 E 6th St', c: 'Brownsville, TX 78520', svc: 'Priority Mail Express', w: '1.4 lb', trk: '9505 5111 2233 4455 6677 00', mode: 'sig', note: 'Express — deliver before 6 PM.' },
      { n: 'Pedro Ybarra', a: '3100 Southmost Rd', c: 'Brownsville, TX 78521', svc: 'Parcel Select Ground', w: '15.8 lb', trk: '9400 3698 7412 5856 3241 11', mode: 'release', note: 'No signature required. Leave at front door.' }
    ]
  },
  dhl: {
    id: 'dhl', brand: 'DHL Express', wm: '<span class="wm-dhl">DHL</span>', sub: 'EXPRESS · COURIER', cls: 'dhl',
    svcTag: '4 stops', routeName: 'DHL Express Route', releaseLabel: 'No signature',
    legal: 'By continuing, you confirm the recipient accepted the shipment. Signature confirms receipt in good condition.',
    origin: 'CINCINNATI, OH', hub: 'BROWNSVILLE, TX',
    stops: [
      { n: 'Valley Tech Repair', biz: 1, a: '899 E 14th St', c: 'Brownsville, TX 78520', svc: 'DHL Express Worldwide', w: '11.2 lb', trk: '8564 2371 09', mode: 'sig', note: 'Deliver to front desk. Opens 9:00 AM.' },
      { n: 'Gulf Coast Auto Parts', biz: 1, a: '1500 Paredes Line Rd', c: 'Brownsville, TX 78521', svc: 'DHL Express Worldwide', w: '22.6 lb', trk: '4884 8888 88', mode: 'sig', note: 'Warehouse entrance on the north side.' },
      { n: 'RGV Dental Lab', biz: 1, a: '3400 Central Blvd', c: 'Brownsville, TX 78526', svc: 'DHL Express Worldwide', w: '6.5 lb', trk: '4561 2378 90', mode: 'sig', note: null },
      { n: 'Borderline Nutrition', biz: 1, a: '555 E Frontage Rd', c: 'Brownsville, TX 78521', svc: 'DHL Express Worldwide', w: '3.8 lb', trk: '1188 5224 36', mode: 'release', note: 'Leave with the cashier at the register.' }
    ]
  },
  amazon: {
    id: 'amazon', brand: 'Amazon Logistics', wm: '<span class="wm-amazon">amazon<span class="a-sub">LOGISTICS</span></span>',
    sub: 'LOGISTICS · ROUTE', cls: 'amazon',
    svcTag: '4 stops', routeName: 'Amazon Delivery Route', releaseLabel: 'Leave at door',
    legal: 'By continuing, you confirm the recipient accepted the package. Signature confirms receipt in good condition.',
    origin: 'DALLAS, TX', hub: 'BROWNSVILLE, TX',
    stops: [
      { n: 'Maria Lozano', a: '4100 Boca Chica Blvd, Apt 12', c: 'Brownsville, TX 78521', svc: 'Amazon Standard', w: '5.2 lb', trk: 'TBA948123456000', mode: 'release', note: 'Leave at door. Gate code 4421.' },
      { n: 'Jesse Herrera', a: '315 E 12th St', c: 'Brownsville, TX 78520', svc: 'Amazon Standard', w: '9.1 lb', trk: 'TBA781234567000', mode: 'release', note: 'Leave at front door.' },
      { n: 'Olivia Pena', a: '550 San Jacinto Blvd', c: 'Brownsville, TX 78520', svc: 'Amazon Standard', w: '2.3 lb', trk: 'TBA123987654000', mode: 'sig', note: 'Customer requested hand delivery to resident.' },
      { n: 'Noah Rodriguez', a: '117 W Price Rd', c: 'Brownsville, TX 78520', svc: 'Amazon Standard', w: '1.9 lb', trk: 'TBA556677889900', mode: 'release', note: null }
    ]
  }
};
const ORDER = ['fedex', 'ups', 'usps', 'dhl', 'amazon'];

/* ================= current session ================= */
let cur = { c: null, i: null, arrived: false };   // route / stop flow
let flow = { stop: null, mode: null, photo: null, camLive: false };

/* ================= timeline ================= */
function checkpoints(c) {
  const rows = [
    ['Shipment information sent', c.origin, atDay(routeDay, -2, 18, 22), 'Label created'],
    ['Picked up', c.origin, atDay(routeDay, -2, 19, 4)],
    ['Departed facility', c.origin, atDay(routeDay, -1, 23, 18)],
    ['Arrived at destination facility', c.hub, atDay(routeDay, 0, 4, 33)],
    ['Out for delivery', c.hub, ROUTE_START]
  ];
  const out = [];
  for (const r of rows) out.push({ t: r[3] || r[0], d: r[1], time: r[2] });
  return out;
}

/* ================= views ================= */
function setCarrierTheme(cid) { document.body.className = cid ? 'c-' + cid : ''; }

function renderHub() {
  const grid = $('#carrier-grid');
  grid.innerHTML = ORDER.map(id => {
    const c = CARRIERS[id];
    const done = doneCount(c);
    const remain = c.stops.length - done;
    return `<button class="carrier-card" data-open="${id}" type="button">
      <span class="cc-mark ${id}">${c.wm}</span>
      <span class="cc-info">
        <span class="cc-name">${c.brand}</span>
        <span class="cc-sub">Route with ${c.stops.length} deliveries · Brownsville, TX</span>
      </span>
      <span class="cc-chip">${done ? remain + ' left · ' + done + ' done' : c.stops.length + ' stops'}</span>
      <svg class="ic cc-arrow"><use href="#i-chev"/></svg>
    </button>`;
  }).join('');
  $$('#carrier-grid [data-open]').forEach(b => b.onclick = () => openRoute(b.dataset.open));
}

function wordmarkHTML(cid) {
  const c = CARRIERS[cid];
  return `<span class="wm">${c.wm}<span class="wm-sub">${c.sub}</span></span>`;
}
function paintChrome(cid) {
  const h = wordmarkHTML(cid);
  $('#wm-route').innerHTML = h; $('#wm-stop').innerHTML = h;
  $('#wm-sig').innerHTML = h; $('#wm-photo').innerHTML = h; $('#wm-pod').innerHTML = h;
}

function doneMap(c) { return state[c.id] || {}; }
function doneCount(c) { return Object.keys(doneMap(c)).length; }
function isDone(c, stop) { return !!doneMap(c)[stop.trk]; }
function stopMeta(c, stop) {
  const d = doneMap(c)[stop.trk];
  if (!d) return null;
  const at = new Date(d.at);
  return { at, name: d.name, mode: d.mode, photo: d.photo || null, sig: d.sig || null };
}

function windowFor(c, i) {
  const s = ROUTE_START.getTime() + (25 + i * 26) * 60000;
  const e = s + 24 * 60000;
  return fmtTime(new Date(s)) + ' – ' + fmtTime(new Date(e));
}

function openRoute(cid) {
  cur = { c: cid, i: null, arrived: false };
  setCarrierTheme(cid);
  paintChrome(cid);
  const c = CARRIERS[cid];
  $('#route-title').textContent = c.routeName;
  $('#route-date').textContent = fmtDate(now) + ' · Brownsville, TX';
  $('#wm-route').innerHTML = wordmarkHTML(cid);
  renderRouteList();
  show('view-route');
}

function renderRouteList() {
  const c = CARRIERS[cur.c];
  const dm = doneMap(c);
  const done = c.stops.filter(s => dm[s.trk]).length;
  const remain = c.stops.length - done;
  $('#stat-left').textContent = remain;
  $('#stat-done').textContent = done;
  $('#stat-started').textContent = fmtTime(ROUTE_START);
  $('#route-tag').textContent = remain ? remain + ' TO GO' : 'ROUTE COMPLETE';
  $('#route-tag').style.background = remain ? '' : '#15803d';
  $('#route-foot-text').textContent =
    'Simulated route. Packages, addresses, and tracking numbers are fictional. Completed stops are stored only in this browser.';
  $('#stops-list').innerHTML = c.stops.map((s, i) => {
    const d = dm[s.trk];
    const badge = d
      ? '<span class="badge done">Delivered</span>'
      : s.mode === 'release'
        ? '<span class="badge release">' + esc(c.releaseLabel) + '</span>'
        : '<span class="badge sig">Signature required</span>';
    const whoIcon = s.biz ? 'i-bld' : 'i-home';
    return `<button class="stop-card${d ? ' done' : ''}" data-stop="${i}" type="button">
      <div class="stop-top">
        <span class="stop-order">Stop ${i + 1} of ${c.stops.length}</span>
        ${badge}
      </div>
      <div class="stop-who"><svg class="ic"><use href="#${whoIcon}"/></svg>${esc(s.n)}</div>
      <div class="stop-addr">${esc(s.a)}<br>${esc(s.c)}</div>
      <div class="stop-meta">
        <span class="trk">${esc(s.trk)}</span>
        ${d
          ? '<span class="svc" style="color:#15803d">Delivered ' + fmtTime(new Date(d.at)) + '</span>'
          : '<span class="svc">' + esc(s.svc) + ' · ETA ' + windowFor(c, i) + '</span>'}
      </div>
    </button>`;
  }).join('');
  $$('#stops-list [data-stop]').forEach(b => b.onclick = () => openStop(+b.dataset.stop));
}

/* ================= stop detail ================= */
function openStop(i) {
  const c = CARRIERS[cur.c];
  const s = c.stops[i];
  if (isDone(c, s)) { openPod(i); return; }
  cur.i = i; cur.arrived = false;
  $('#wm-stop').innerHTML = wordmarkHTML(cur.c);
  const dm = doneMap(c);
  const badge = s.mode === 'release'
    ? '<span class="badge release">' + esc(c.releaseLabel) + '</span>'
    : '<span class="badge sig">Signature required</span>';
  const whoIcon = s.biz ? 'i-bld' : 'i-home';
  $('#stop-body').innerHTML = `
    <div class="stop-body-pad">
      <div class="status-banner">
        <div class="sb-ic"><svg><use href="#i-truck"/></svg></div>
        <div>
          <div class="sb-big">OUT FOR DELIVERY</div>
          <div class="sb-small">Delivery window ${windowFor(c, i)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-h">Deliver to</div>
        <div class="card-big" style="display:flex;align-items:center;gap:8px"><svg class="ic" style="width:18px;height:18px;color:#64748b"><use href="#${whoIcon}"/></svg>${esc(s.n)}</div>
        <div class="row" style="margin-top:6px"><span class="k">Address</span><span class="v normal" style="font-weight:600">${esc(s.a)}<br>${esc(s.c)}</span></div>
        ${badge ? `<div class="row"><span class="k">Delivery</span><span class="v">${badge}</span></div>` : ''}
      </div>
      <div class="card">
        <div class="card-h">Package</div>
        <div class="row"><span class="k">Tracking no.</span><span class="v">${esc(s.trk)}</span></div>
        <div class="row"><span class="k">Service</span><span class="v">${esc(s.svc)}</span></div>
        <div class="row"><span class="k">Weight</span><span class="v">${esc(s.w)}</span></div>
      </div>
      ${s.note ? `<div class="notes"><svg class="ic"><use href="#i-pen"/></svg><span>${esc(s.note)}</span></div>` : ''}
      <button class="big-btn" id="btn-arrive" type="button">
        <svg class="ic"><use href="#i-pin"/></svg>Arrive at stop
      </button>
      <details class="tl" open>
        <summary>Tracking history <svg class="ic"><use href="#i-chev"/></svg></summary>
        <div class="tl-list" id="tl-list"></div>
      </details>
    </div>`;
  const tl = $('#tl-list');
  const cps = checkpoints(c);
  tl.innerHTML = cps.map((p, k) => `
    <div class="tl-item${k === cps.length - 1 ? ' on' : ''}">
      <div class="tl-dot"><span class="d"></span><span class="line"></span></div>
      <div class="tl-t">${esc(p.t)}<small>${esc(p.d)}</small></div>
      <div class="tl-time">${fmtTime(p.time)}</div>
    </div>`).join('');
  $('#btn-arrive').onclick = arriveAtStop;
  show('view-stop');
}

function arriveAtStop() {
  const c = CARRIERS[cur.c];
  const s = c.stops[cur.i];
  const ov = document.createElement('div');
  ov.className = 'arrive-overlay';
  ov.innerHTML = `<div class="arrive-card">
      <div class="a-ic"><svg><use href="#i-check"/></svg></div>
      <h3>You have arrived</h3>
      <p>${esc(s.a)}<br>${esc(s.c)}</p>
    </div>`;
  document.body.appendChild(ov);
  setTimeout(() => {
    ov.remove();
    cur.arrived = true;
    if (s.mode === 'release') openPhoto('leave');
    else openSig();
  }, 1100);
}

/* ================= signature ================= */
let sigInk = false, sigStreaming = false;
function initSigCanvas() {
  const cv = $('#sig-canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(cv.clientWidth, 300);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(w * dpr * 0.30);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.lineWidth = Math.max(4, cv.width / 320);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#101828';
  sigInk = false;
  $('#sig-continue').disabled = true;
  $('#sig-hint').classList.remove('gone');
}
function sigPos(e) {
  const r = $('#sig-canvas').getBoundingClientRect();
  const cv = $('#sig-canvas');
  return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
}
function openSig() {
  const c = CARRIERS[cur.c];
  const s = c.stops[cur.i];
  flow = { stop: cur.i, mode: 'sig', photo: null, camLive: false };
  $('#wm-sig').innerHTML = wordmarkHTML(cur.c);
  $('#sig-sub').textContent = 'Stop ' + (cur.i + 1) + ' of ' + c.stops.length + ' · ' + s.n + ' · ' + s.a;
  $('#sig-name').value = s.biz ? s.n : s.n;
  $('#sig-legal').textContent = c.legal;
  $('#sig-note').textContent = '';
  show('view-sig');
  requestAnimationFrame(initSigCanvas);
}
function wireSig() {
  const cv = $('#sig-canvas');
  let drawing = false, last = null;
  const down = e => {
    drawing = true;
    last = sigPos(e);
    sigInk = true;
    $('#sig-hint').classList.add('gone');
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    checkSigReady();
  };
  const move = e => {
    if (!drawing) return;
    const p = sigPos(e);
    const ctx = cv.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  };
  const up = () => { drawing = false; checkSigReady(); };
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointerleave', up);
  $('#sig-name').addEventListener('input', checkSigReady);
  $('#sig-clear').onclick = () => { initSigCanvas(); checkSigReady(); };
  $('#sig-cancel').onclick = () => openStop(cur.i);
  $('#sig-continue').onclick = () => openPhoto('sig');
}
function checkSigReady() {
  const ok = sigInk && $('#sig-name').value.trim().length >= 2;
  $('#sig-continue').disabled = !ok;
}
/* test hook: simulate a real ink stroke (used by automated checks) */
function __simDraw() {
  const cv = $('#sig-canvas');
  const ctx = cv.getContext('2d');
  ctx.strokeStyle = '#101828';
  ctx.lineWidth = cv.width / 220;
  ctx.beginPath();
  ctx.moveTo(cv.width * 0.08, cv.height * 0.62);
  ctx.bezierCurveTo(cv.width * 0.3, cv.height * 0.15, cv.width * 0.6, cv.height * 1.05, cv.width * 0.92, cv.height * 0.5);
  ctx.stroke();
  sigInk = true;
  $('#sig-hint').classList.add('gone');
  checkSigReady();
}

/* ================= photo ================= */
function openPhoto(mode) {
  const c = CARRIERS[cur.c];
  const s = c.stops[cur.i];
  flow = { stop: cur.i, mode, photo: null, camLive: false };
  $('#wm-photo').innerHTML = wordmarkHTML(cur.c);
  if (mode === 'leave') {
    $('#photo-step-chip').textContent = 'Driver release';
    $('#photo-h').textContent = 'Leave the package at the door';
    $('#photo-sub').textContent = 'Take a photo showing where the package was left.';
    $('#photo-empty-text').textContent = 'Show the package at the door';
  } else {
    $('#photo-step-chip').textContent = 'Proof of delivery';
    $('#photo-h').textContent = 'Take a photo of the delivery';
    $('#photo-sub').textContent = 'Show the package at the door after drop-off.';
    $('#photo-empty-text').textContent = 'Show the package at the door';
  }
  $('#sig-name').blur && $('#sig-name').blur();
  stopCam();
  setPhotoStage('empty');
  show('view-photo');
}
function setPhotoStage(kind) {
  $('#cam-live').hidden = kind !== 'live';
  $('#cam-shot').hidden = kind !== 'shot';
  $('#photo-empty').style.display = kind === 'empty' ? '' : 'none';
  $('#cam-live').style.display = kind === 'live' ? 'block' : 'none';
  $('#cam-shot').style.display = kind === 'shot' ? 'block' : 'none';
  const live = kind === 'live';
  $('#btn-cam').innerHTML = live
    ? '<svg class="ic"><use href="#i-cam"/></svg>Snap photo'
    : '<svg class="ic"><use href="#i-cam"/></svg>Take photo';
}
function photoActions(kind, hasShot) {
  if (kind === 'empty') {
    $('#btn-cam').disabled = false;
    $('#btn-cam').style.display = '';
    $('#btn-file').style.display = '';
    $('#btn-cam').onclick = startCam;
    $('#btn-file').onclick = () => $('#file-input').click();
    $('#photo-skip').style.display = '';
  } else if (kind === 'live') {
    $('#btn-cam').disabled = false;
    $('#btn-cam').style.display = '';
    $('#btn-file').style.display = 'none';
    $('#btn-cam').onclick = snapPhoto;
    $('#photo-skip').style.display = 'none';
  } else { /* shot */
    $('#btn-cam').innerHTML = hasShot ? 'Use this photo' : 'Retake';
    $('#btn-cam').onclick = hasShot ? () => finishFlow() : startCam;
    $('#btn-file').style.display = hasShot ? 'none' : '';
    $('#btn-cam').disabled = false;
    $('#photo-skip').style.display = hasShot ? 'none' : '';
  }
}
async function startCam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('Camera unavailable — choose a photo instead');
    $('#file-input').click();
    return;
  }
  stopCam();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false
    });
    flow.camLive = true;
    flow._stream = stream;
    const v = $('#cam-live');
    v.srcObject = stream;
    await v.play().catch(() => {});
    setPhotoStage('live');
    photoActions('live');
  } catch (err) {
    toast('Camera blocked — choose a photo instead');
    $('#file-input').click();
  }
}
function stopCam() {
  if (flow._stream) {
    flow._stream.getTracks().forEach(t => t.stop());
    flow._stream = null;
    flow.camLive = false;
  }
}
function snapPhoto() {
  const v = $('#cam-live');
  const w = 900, h = 675;
  const cv = $('#cam-shot');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const vw = v.videoWidth, vh = v.videoHeight;
  const scale = Math.max(w / vw, h / vh);
  const dw = vw * scale, dh = vh * scale;
  ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
  flow.photo = cv.toDataURL('image/jpeg', 0.62);
  stopCam();
  cv.hidden = false;
  setPhotoStage('shot');
  photoActions('shot', true);
}
function handleFile(file) {
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const w = 900, h = Math.round(img.naturalHeight * (900 / img.naturalWidth));
      const cv = $('#cam-shot');
      cv.width = 900; cv.height = Math.min(h, 1200);
      const ctx = cv.getContext('2d');
      const dw = 900, dh = Math.min(h, 1200);
      ctx.drawImage(img, 0, 0, dw, dh);
      flow.photo = cv.toDataURL('image/jpeg', 0.62);
      setPhotoStage('shot');
      photoActions('shot', true);
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}
function wirePhoto() {
  $('#btn-cam').onclick = startCam;
  $('#btn-file').onclick = () => $('#file-input').click();
  $('#file-input').onchange = e => handleFile(e.target.files[0]);
  $('#photo-skip').onclick = () => { flow.photo = null; finishFlow(); };
  $('#photo-back').onclick = () => { stopCam(); if (flow.mode === 'sig') openSig(); else openStop(cur.i); };
}

/* ================= finish / proof of delivery ================= */
function finishFlow() {
  const c = CARRIERS[cur.c];
  const s = c.stops[cur.i];
  const name = flow.mode === 'sig' ? $('#sig-name').value.trim() : null;
  const rec = { at: new Date().toISOString(), mode: flow.mode, name, photo: flow.photo || null };
  if (flow.mode === 'sig') {
    try { rec.sig = $('#sig-canvas').toDataURL('image/png'); } catch (e) { rec.sig = null; }
  }
  let ok = false;
  try {
    state[c.id] = state[c.id] || {};
    state[c.id][s.trk] = rec;
    localStorage.setItem(KEY, JSON.stringify(state));
    ok = true;
  } catch (e) {
    /* quota: retry without the photo */
    rec.photo = null;
    try { localStorage.setItem(KEY, JSON.stringify(state)); ok = true; toast('Photo was too large and was skipped'); }
    catch (e2) { toast('Could not save — storage unavailable'); return; }
  }
  stopCam();
  openPod(cur.i);
}

function openPod(i) {
  const c = CARRIERS[cur.c];
  const s = c.stops[i];
  const d = doneMap(c)[s.trk];
  if (!d) { openStop(i); return; }
  const at = new Date(d.at);
  $('#wm-pod').innerHTML = wordmarkHTML(cur.c);
  const isSig = d.mode === 'sig';
  const photoBlock = d.photo
    ? `<div class="card"><div class="card-h">Proof of delivery photo</div><div class="pod-photo"><img src="${d.photo}" alt="Delivery photo"></div></div>`
    : '';
  const sigBlock = d.sig
    ? `<div class="card"><div class="card-h">Signature</div><div class="pod-sig"><img src="${d.sig}" alt="Recipient signature"></div></div>`
    : '';
  $('#pod-body').innerHTML = `
    <div class="pod-wrap">
      <div class="pod-ok">
        <div class="ok-ic"><svg><use href="#i-check"/></svg></div>
        <h2>${isSig ? 'Delivered' : 'Left at front door'}</h2>
        <div class="pod-sub">${esc(s.n)} · ${esc(s.a)}</div>
        <span class="pod-time">${fmtTime(at)} · ${at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
      <div class="card">
        <div class="card-h">Delivery details</div>
        ${isSig ? `<div class="pod-line"><span class="k">Signed by</span><span class="v">${esc(d.name || '—')}</span></div>` : ''}
        <div class="pod-line"><span class="k">Method</span><span class="v">${isSig ? 'Signature on delivery' : esc(c.releaseLabel) + ' — left at door'}</span></div>
        <div class="pod-line"><span class="k">Tracking no.</span><span class="v">${esc(s.trk)}</span></div>
        <div class="pod-line"><span class="k">Service</span><span class="v">${esc(s.svc)}</span></div>
        <div class="pod-line"><span class="k">Address</span><span class="v">${esc(s.a)}, ${esc(s.c)}</span></div>
      </div>
      ${sigBlock}
      ${photoBlock}
      <div class="pod-actions">
        <button class="primary-btn" data-goto="route" type="button">Back to route</button>
        <button class="ghost-btn center" data-goto="hub" type="button">All carriers</button>
      </div>
      <p class="microcopy">Simulated proof of delivery — not a real carrier record.</p>
    </div>`;
  show('view-pod');
}

/* ================= nav wiring ================= */
function goBackTo(viewId) {
  if (viewId === 'hub') { setCarrierTheme(null); show('view-hub'); }
  else if (viewId === 'route') { setCarrierTheme(cur.c); renderRouteList(); show('view-route'); }
}
function wireNav() {
  $('#stop-back').onclick = () => goBackTo('route');
  /* delegation for buttons rendered after boot */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-back]');
    if (b) { goBackTo(b.dataset.back); return; }
    const g = e.target.closest('[data-goto]');
    if (g) { goBackTo(g.dataset.goto); return; }
    const o = e.target.closest('#carrier-grid [data-open]');
    if (o) openRoute(o.dataset.open);
  });
  const resetAll = () => {
    Object.keys(state).forEach(k => delete state[k]);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    renderHub();
    toast('Demo data cleared');
  };
  $('#btn-global-reset').onclick = resetAll;
  $$('[data-reset]').forEach(b => b.onclick = resetAll);
}

/* ================= boot ================= */
function boot() {
  wireSig();
  wirePhoto();
  wireNav();
  renderHub();
  show('view-hub');
}
document.addEventListener('DOMContentLoaded', boot);
