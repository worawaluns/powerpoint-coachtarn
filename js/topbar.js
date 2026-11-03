/* แถบบนเดียวกันทุกหน้า + popup เข้าสู่ระบบ + แผ่นบัญชี (งาน 046, ไอซ์ 3 พ.ย. 2569) คู่กับ topbar.css
   ใช้: <link rel="stylesheet" href="topbar.css"> ในหัว + <div id="ct-top" data-on="templates"></div> + <script src="js/topbar.js"></script>
   data-locked = หน้าสั่งซื้อ (โลโก้อย่างเดียว ไม่มีลิงก์ออก)
   ตรวจ Code ด้วย verify-code ตัวเดียวกับ templates.html / download.html เก็บ ct_lib รูปเดิม {code, name, t}

   Icons: Phosphor Icons 2.1.1 (https://phosphoricons.com), MIT License, Copyright (c) 2023 Phosphor Icons */
(function () {
const ICONS = {
  "list": "<path d=\"M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z\"/>",
  "magnifying-glass": "<path d=\"M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z\"/>",
  "user-circle": "<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z\"/>",
  "x": "<path d=\"M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z\"/>",
  "download-simple": "<path d=\"M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z\"/>",
  "arrow-square-out": "<path d=\"M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z\"/>",
  "question": "<path d=\"M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z\"/>",
  "chat-circle-dots": "<path d=\"M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Zm60,12A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z\"/>",
  "file-text": "<path d=\"M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-32-80a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,136Zm0,32a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,168Z\"/>",
  "user-switch": "<path d=\"M253.66,133.66l-24,24a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L216,132.69V128A88,88,0,0,0,56.49,76.67a8,8,0,0,1-13-9.34A104,104,0,0,1,232,128v4.69l10.34-10.35a8,8,0,0,1,11.32,11.32Zm-41.18,55A104,104,0,0,1,24,128v-4.69L13.66,133.66A8,8,0,0,1,2.34,122.34l24-24a8,8,0,0,1,11.32,0l24,24a8,8,0,0,1-11.32,11.32L40,123.31V128a87.62,87.62,0,0,0,22.24,58.41A79.66,79.66,0,0,1,98.3,157.66a48,48,0,1,1,59.4,0,79.59,79.59,0,0,1,36.08,28.78,89.68,89.68,0,0,0,5.71-7.11,8,8,0,0,1,13,9.34ZM128,152a32,32,0,1,0-32-32A32,32,0,0,0,128,152Zm0,64a88.2,88.2,0,0,0,53.92-18.49,64,64,0,0,0-107.84,0A87.57,87.57,0,0,0,128,216Z\"/>",
  "sign-out": "<path d=\"M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z\"/>",
  "caret-right": "<path d=\"M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z\"/>",
  "seal-check-fill": "<path d=\"M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-52.2,6.84-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z\"/>",
  "check-circle-fill": "<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z\"/>",
  "shield-check": "<path d=\"M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z\"/>",
  "shopping-bag": "<path d=\"M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z\"/>",
  "squares-four-fill": "<path d=\"M120,56v48a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40h48A16,16,0,0,1,120,56Zm80-16H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm-96,96H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm96,0H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Z\"/>",
  "play-fill": "<path d=\"M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z\"/>"
};
const ic = (n, c) => `<svg class="tb-i${c ? ' ' + c : ''}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${ICONS[n]}</svg>`;
const STUDIO = '<img class="tb-i" src="img/studio-mark.svg" alt="">';
const chev = ic('caret-right', 'tb-chev');
// ไอซ์ 3 พ.ย.: avatar = ไอคอนรูปคน ในวงกลมส้มอ่อน
const AV = () => `<i><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.2" r="4.2"/><path d="M3.8 20.1c.4-4 3.9-6.6 8.2-6.6s7.8 2.6 8.2 6.6c0 .5-.3.9-.8.9H4.6c-.5 0-.9-.4-.8-.9z"/></svg></i>`;
const REDUCE = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// same Edge Function + public anon key as templates.html / download.html
const SB_URL = 'https://uyubtzyhuqalmjpjhmap.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dWJ0enlodXFhbG1qcGpobWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjkzNjQsImV4cCI6MjA4OTMwNTM2NH0.z11wUqyRWOSsI5o_STNZWZx-e1HV7UuLe7bEtipk3nQ';
const PATTERN = /^TARN-[A-Z0-9]{8}$/i;
const ADMIN = 'https://m.me/coachtarn';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const me = () => { try { const v = JSON.parse(localStorage.getItem('ct_lib') || 'null'); return v && v.code ? v : null; } catch (e) { return null; } };

const root = document.getElementById('ct-top');
if (!root) return;
const locked = root.hasAttribute('data-locked'), on = root.dataset.on || '';
const m = me();

function bar() {
  if (locked) return `<header class="tb-bar tb-locked"><div class="tb-in"><span class="tb-logo"><img src="img/logo.svg" alt="Coach Tarn"></span></div></header>`;
  const L = [['templates', 'templates.html', 'คลังเทมเพลต'], ['download', 'download.html', 'วิธีดาวน์โหลด'], ['admin', ADMIN, 'ติดต่อแอดมิน']];
  const seg = L.map(([k, h, t]) => `<a href="${h}"${k === on ? ' class="tb-on"' : ''}${k === 'admin' ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`).join('');
  const right = m
    ? `<button class="tb-srch tb-dsk" data-a="search">${ic('magnifying-glass')}<span>ค้นหาเทมเพลต</span></button><button class="tb-av" data-a="acct" aria-label="บัญชีของฉัน">${AV()}</button>`
    : `<button class="tb-cb tb-dsk" data-a="search" aria-label="ค้นหา">${ic('magnifying-glass')}</button><button class="tb-cb" data-a="login" aria-label="เข้าสู่ระบบ">${ic('user-circle')}</button><a class="tb-cap" href="order.html">สั่งซื้อ 499฿</a>`;
  return `<header class="tb-bar"><div class="tb-in"><span style="display:flex;align-items:center"><button class="tb-cb tb-menu" data-a="menu" aria-label="เมนู">${ic('list')}</button>
    <a class="tb-logo" href="${m ? 'templates.html' : 'index.html'}"><img src="img/logo.svg" alt="Coach Tarn"></a></span>
    <nav class="tb-nav">${seg}</nav><div class="tb-right">${right}</div></div></header>`;
}

const row = (a, icon, text, end, attr) => `<${a ? 'a' : 'button'} class="tb-row${attr && attr.red ? ' tb-red' : ''}${a && a.split('.')[0] === on ? ' tb-here' : ''}" ${a ? `href="${a}"` : `data-a="${attr.act}"`}${a === ADMIN ? ' target="_blank" rel="noopener"' : ''}>${icon}${text}${end || ''}</${a ? 'a' : 'button'}>`;

function menuBody() {
  const tail = m ? '' : `<div class="tb-grp">${row(0, ic('user-circle'), 'เข้าสู่ระบบ', '', { act: 'login' })}${row('order.html', ic('shopping-bag'), 'สั่งซื้อ 499฿')}</div>`;
  return `<button class="tb-msrch" data-a="search">${ic('magnifying-glass')}<span>ค้นหาเทมเพลต</span></button>
    <div class="tb-grp">${row('templates.html', ic('squares-four-fill'), 'คลังเทมเพลต', chev)}${row('download.html', ic('question'), 'วิธีดาวน์โหลด', chev)}${row(ADMIN, ic('chat-circle-dots'), 'ติดต่อแอดมิน', chev)}</div>${tail}`;
}
function acctBody() {
  const u = me() || {}, code = String(u.code || '');
  return `<div class="tb-phd"><span class="tb-av tb-lg">${AV()}</span><span><b>${esc(u.name || 'สมาชิก')}</b>
      <small>${esc(code.slice(0, 5))}••••${esc(code.slice(-4))} <span class="tb-ok">${ic('seal-check-fill')}ใช้งานได้ทุกชุด</span></small></span></div>
    <div class="tb-grp">${row('download.html', ic('download-simple'), 'หน้าดาวน์โหลด', chev)}${row('studio/', STUDIO, 'เปิด Slide Studio', ic('arrow-square-out', 'tb-chev'))}</div>
    <div class="tb-grp">${row('guide.html', ic('question'), 'วิธีดาวน์โหลด', chev)}${row(ADMIN, ic('chat-circle-dots'), 'ติดต่อแอดมิน', chev)}${row('terms.html', ic('file-text'), 'สิทธิ์การใช้ไฟล์', chev)}</div>
    <div class="tb-grp">${row(0, ic('user-switch'), 'เข้าสู่ระบบด้วย Code อื่น', '', { act: 'login' })}${row(0, ic('sign-out'), 'ออกจากระบบ', '', { act: 'logout', red: 1 })}</div>`;
}
function loginBody() {
  return `<div class="tb-shd"><h3>เข้าสู่ระบบ</h3><button class="tb-cb" data-a="close" aria-label="ปิด">${ic('x')}</button></div>
    <p class="tb-lsub">ใส่ Code ที่ส่งไปทางอีเมลหลังสั่งซื้อ</p>
    <form class="tb-fld" data-f="login" novalidate><label for="tbCode">Code จากอีเมล</label>
      <input id="tbCode" placeholder="TARN-XXXXXXXX" maxlength="13" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go">
      <p class="tb-err" id="tbErr" role="alert"></p>
      <button class="tb-cap tb-lg" style="margin-top:14px" id="tbGo">เข้าสู่ระบบ</button></form>
    <p class="tb-lnk">ยังไม่มี Code? <a href="order.html">สั่งซื้อ 499฿</a></p>`;
}
function doneBody(name) {
  return `<div class="tb-done"><span>${ic('check-circle-fill')}</span><h3>เข้าสู่ระบบแล้ว</h3>
      <p>${name ? `สวัสดี คุณ${esc(name)} ` : ''}โหลดได้ทุกชุดในคลัง</p></div>
    <div class="tb-lic">${ic('shield-check')}<p>ใช้ได้ไม่จำกัด ห้ามแจกหรือขายต่อไฟล์และ Code <a href="terms.html" target="_blank" rel="noopener">อ่านสิทธิ์ฉบับเต็ม</a></p></div>
    <a class="tb-cap tb-lg" style="margin-top:16px" href="templates.html">ไปที่คลังเทมเพลต</a>`;
}

let scrim = null, sheet = null, done = false;
function close() {
  if (!sheet) return;
  const s = sheet, c = scrim; scrim = sheet = null; document.body.style.overflow = '';
  root.querySelectorAll('.tb-on[data-a]').forEach(b => b.classList.remove('tb-on'));
  const gone = () => { s.remove(); c.remove(); if (done) location.reload(); };   // เพิ่งเข้าสู่ระบบ: วาดหน้าใหม่ให้เห็นปุ่มดาวน์โหลด
  if (REDUCE()) return gone();
  s.classList.add('tb-out'); c.classList.add('tb-out'); setTimeout(gone, 160);   // ปิด 160ms แล้วค่อยถอด
}
function open(kind, html, btn) {
  close();
  scrim = document.createElement('div'); scrim.className = 'tb-scrim' + (kind === 'menu' ? ' tb-under' : ''); scrim.onclick = close;
  sheet = document.createElement('div'); sheet.className = 'tb-sheet tb-s-' + kind; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = html; sheet.addEventListener('click', act);
  document.body.append(scrim, sheet); document.body.style.overflow = 'hidden';
  if (btn) btn.classList.add('tb-on');
}
function login() {
  open('login', loginBody());
  const inp = document.getElementById('tbCode');
  inp.addEventListener('input', () => {   // same auto-format as download.html
    let v = inp.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (v.length >= 4 && !v.includes('-')) v = v.slice(0, 4) + '-' + v.slice(4);
    inp.value = v.slice(0, 13); err('');
  });
  sheet.querySelector('form').addEventListener('submit', e => { e.preventDefault(); verify(); });
  setTimeout(() => inp.focus(), 50);
}
function err(msg) {
  const e = document.getElementById('tbErr'); if (!e) return;
  const inp = document.getElementById('tbCode');
  e.textContent = msg; e.classList.toggle('show', !!msg); inp.classList.toggle('tb-bad', !!msg);
  if (msg) { inp.classList.remove('tb-shake'); void inp.offsetWidth; inp.classList.add('tb-shake'); }   // สั่นทุกครั้งที่ผิด
}
async function verify() {
  const code = document.getElementById('tbCode').value.trim().toUpperCase(), btn = document.getElementById('tbGo');
  if (!PATTERN.test(code)) return err('รูปแบบ Code ไม่ถูกต้อง ตัวอย่าง: TARN-A3K9P2MX');
  btn.disabled = true; btn.innerHTML = '<span class="tb-spin"></span>กำลังตรวจสอบ...'; err('');
  try {
    const r = await fetch(`${SB_URL}/functions/v1/verify-code`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SB_KEY}` }, body: JSON.stringify({ code }) });
    const d = await r.json();
    if (!d.valid) return err(d.reason === 'not_found' ? 'ไม่พบ Code นี้ ตรวจตัวอักษรในอีเมลอีกครั้ง' : 'ตรวจสอบไม่สำเร็จ ลองใหม่อีกครั้ง');
    try { localStorage.setItem('ct_lib', JSON.stringify({ code, name: d.name || '', t: Date.now() })); } catch (e) {}
    done = true; sheet.innerHTML = doneBody(d.name || '');
  } catch (e) { err('เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง'); }
  finally { if (btn.isConnected) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; } }
}
function search() {
  const q = document.getElementById('q');   // templates.html search box
  if (!q) { location.href = 'templates.html#search'; return; }
  close(); q.scrollIntoView({ block: 'center' }); q.focus();
}
function act(e) {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'menu') return open('menu', menuBody(), b);
  if (a === 'acct') return open('acct', acctBody(), b);
  if (a === 'login') return login();
  if (a === 'search') return search();
  if (a === 'close') return close();
  if (a === 'logout' && confirm('ออกจากระบบ? ต้องกรอก Code ใหม่เพื่อโหลดไฟล์')) {
    try { localStorage.removeItem('ct_lib'); } catch (x) {}
    location.href = 'templates.html';
  }
}
root.innerHTML = bar();
root.addEventListener('click', act);
document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
if (location.hash === '#search') addEventListener('DOMContentLoaded', () => { if (document.getElementById('q')) setTimeout(search, 300); });
window.ctTop = { login, ic };   // ic = same Phosphor icons for page buttons (template.html)
})();
