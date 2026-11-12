/* โค้ดส่วนลด (โปรวันคู่ 11.11 / โปรวันเงินเดือนออก)
 *
 * เห็นราคาโปรได้ทางเดียวคือกดลิงก์ /dd/<โค้ด> แล้วเครื่องจำโค้ดไว้ใน localStorage
 * เข้าเว็บเฉยๆ ไม่เคยกดลิงก์ = ราคาปกติ ไม่มีแถบ ไม่มีป๊อปอัพ
 * หมดเขตแล้วกลับเป็นราคาปกติเอง ไม่ต้องแก้มือ
 *
 * ราคาบนหน้าเว็บเป็นแค่การแสดงผล ตัวตัดสินจริงคือ verify-slip ฝั่ง server
 * ช่วงวันกับราคาอยู่ในตาราง promo_codes เปลี่ยนหรือปิดโปรได้จากฐานข้อมูล ไม่ต้องแก้ไฟล์นี้
 */
(function () {
  var API  = 'https://uyubtzyhuqalmjpjhmap.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dWJ0enlodXFhbG1qcGpobWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjkzNjQsImV4cCI6MjA4OTMwNTM2NH0.z11wUqyRWOSsI5o_STNZWZx-e1HV7UuLe7bEtipk3nQ';
  // LIST = ราคาที่ขีดฆ่าทั้งเว็บ, SELL = ราคาขายปกติของแพ็ก 1 สิทธิ์
  // เปอร์เซ็นต์ส่วนลดต้องคิดจาก LIST เหมือนหน้าปกติ ไม่งั้นคนกดโฆษณาเข้ามา
  // จะเห็นเลขส่วนลด "น้อยกว่า" คนที่เข้าเว็บเฉยๆ ทั้งที่จ่ายถูกกว่า
  var LIST = 999;
  var SELL = 499;
  var SAVE = 'ct_promo';
  var SLOW = matchMedia('(prefers-reduced-motion:reduce)').matches;

  function store(v) { try { v ? localStorage.setItem(SAVE, JSON.stringify(v)) : localStorage.removeItem(SAVE); } catch (e) {} }

  function saved() {
    try {
      var p = JSON.parse(localStorage.getItem(SAVE) || 'null');
      if (p && p.code && p.price && Date.parse(p.ends) > Date.now()) return p;
      if (p) store(null);                       // หมดเขตแล้ว ลืมทิ้งไปเลย
    } catch (e) {}
    return null;
  }

  window.CT_PROMO = saved();

  var q    = new URLSearchParams(location.search);
  var code = (q.get('code') || '').trim().toUpperCase();
  var ref  = q.get('ref') || (window.CT_PROMO && window.CT_PROMO.ref) || null;

  if (code && (!window.CT_PROMO || window.CT_PROMO.code !== code)) lookup(code);
  else ready(!!code);     // กดลิงก์โปรซ้ำก็ต้องได้ป๊อปอัพอีก เว้นคนที่เคยกดปิดไปแล้ว

  function lookup(c) {
    // กดลิงก์โปรมา: ใช้ไม่ได้ก็เงียบ หน้าแรกปกติ ไม่บอกว่ามีโปร
    check(c, function (p) {
      if (!p) return ready(false);
      window.CT_PROMO = p;
      store(p);
      ready(true);
    });
  }

  // ตรวจโค้ดกับตาราง promo_codes — cb(โปร) ถ้าใช้ได้ cb(null, เหตุผล) ถ้าไม่ได้
  // RLS คืนมาแค่โค้ดที่ active อยู่ เลยไม่ต้องเช็ก active เองอีก
  function check(c, cb) {
    fetch(API + '/rest/v1/promo_codes?select=code,discount_price,label,starts_at,ends_at&code=eq.' + encodeURIComponent(c), {
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON }
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        var p = rows && rows[0];
        if (!p) return cb(null, 'ไม่พบโค้ดนี้ ลองเช็กตัวสะกดอีกครั้ง');
        var now = Date.now();
        if (now < Date.parse(p.starts_at)) return cb(null, 'โค้ดนี้ยังใช้ไม่ได้ในตอนนี้');
        if (now > Date.parse(p.ends_at))   return cb(null, 'โค้ดนี้หมดอายุแล้ว');
        cb({ code: p.code, price: +p.discount_price, label: p.label, ends: p.ends_at, ref: ref });
      })
      .catch(function () { cb(null, 'เช็กโค้ดไม่สำเร็จ ลองอีกครั้ง'); });
  }

  // fromLink = เข้ามาด้วยลิงก์ที่มีโค้ด (ใช้ตัดสินว่าจะเด้งป๊อปอัพไหม)
  function ready(fromLink) {
    var p = window.CT_PROMO;
    if (!p) return;
    if (window.ctRenderPrice) window.ctRenderPrice();      // หน้าสั่งซื้อคิดราคาเอง
    onDom(function () { paint(p, fromLink); });
  }

  function onDom(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  var TAG = '<svg viewBox="0 0 24 24"><path d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.8 0L3 13.8V4h9.8l7.8 7.8a2 2 0 0 1 0 .8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>';

  function money(n) { return (+n).toLocaleString('en-US'); }

  // โค้ดจากแชทตั้งวันหมดอายุไว้ไกลมาก (ปี 2031) โชว์วันที่แล้วลูกค้าจะอ่านว่าเดือนหน้า
  // ไอซ์ 12 พ.ย. 2569: ซ่อนวันที่เฉพาะโค้ดแชท แล้วเร่งให้โอนแทน
  function isChat(p) { return p.label === 'ราคาพิเศษจากแชท'; }

  function endText(iso, withTime) {
    var d = new Date(iso);
    var m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][d.getMonth()];
    var s = d.getDate() + ' ' + m;
    return withTime ? s + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' น.' : s;
  }

  function paint(p, fromLink) {
    var vars = {
      p   : money(p.price),
      full: money(LIST),                              // ราคาที่ขีดฆ่า เท่ากับหน้าปกติ
      off : Math.round((1 - p.price / LIST) * 100),   // คิดจาก LIST เหมือนหน้าปกติ
      cut : money(SELL - p.price)                     // ลดเพิ่มจากราคาขายปกติ
    };

    css();

    // ราคาในหน้า — จุดที่ต้องเปลี่ยนมี data-p1 กำกับไว้ในไฟล์ HTML
    document.querySelectorAll('[data-p1]').forEach(function (el) {
      el.textContent = el.getAttribute('data-p1').replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; });
    });

    strip(p, vars.cut);
    sticker(p);
    links(p);
    buyText(p);
    if (fromLink) sheet(p, vars);
  }

  // แถบโปรใต้แถบบน มีที่เดียวในหน้า ประโยคเดียวบอกครบว่าลดเท่าไหร่ ถึงเมื่อไหร่
  function strip(p, cut) {
    var host = document.getElementById('ct-top');
    if (!host || document.querySelector('.ct-pstrip')) return;
    var d = document.createElement('div');
    d.className = 'ct-pstrip';
    d.innerHTML = TAG + '<p>ใส่โค้ด <b>' + p.code + '</b> ให้แล้ว ลดเพิ่มอีก <b>' + cut + '฿</b> ' +
      (isChat(p) ? 'โอนแล้วรับโค้ดทางอีเมลทันที' : 'ถึง <b>' + endText(p.ends, false) + '</b>') + '</p>';
    host.parentNode.insertBefore(d, host.nextSibling);
  }

  function sticker(p) {
    var hero = document.querySelector('.hero-inner');
    if (!hero || !p.label || document.querySelector('.hero-inner .ct-sticker')) return;
    hero.insertBefore(stickerEl(p), hero.firstElementChild);
  }

  function stickerEl(p) {
    var parts = p.label.split(' ');
    var d = document.createElement('div');
    d.className = 'ct-sticker';
    d.innerHTML = '<b>' + parts[0] + '</b>' + (parts.length > 1 ? '<span>' + parts.slice(1).join(' ') + '</span>' : '');
    return d;
  }

  // ปุ่มสั่งซื้อบนแถบบนกับในเมนู topbar.js เป็นคนสร้าง ไม่มี data-p1 ให้แก้
  // เลยตามแก้ข้อความทีหลัง และเฝ้าไว้เผื่อเมนูถูกสร้างตอนกด
  function buyText(p) {
    var want = 'สั่งซื้อ ' + money(p.price) + '฿';
    function fix() {
      document.querySelectorAll('a,button').forEach(function (el) {
        if (el.children.length === 0 && el.textContent.trim() === 'สั่งซื้อ ' + money(SELL) + '฿') el.textContent = want;
      });
    }
    fix();
    new MutationObserver(fix).observe(document.body, { childList: true, subtree: true });
  }

  // ทุกปุ่มที่พาไปหน้าสั่งซื้อต้องหอบโค้ดไปด้วย ลูกค้าจะไม่ต้องพิมพ์เอง
  function links(p) {
    linkPass(p);
    new MutationObserver(function () { linkPass(p); }).observe(document.body, { childList: true, subtree: true });
  }

  function linkPass(p) {
    document.querySelectorAll('a[href^="order"]:not([data-ctp])').forEach(function (a) {
      a.setAttribute('data-ctp', '1');
      var u = new URL(a.getAttribute('href'), location.origin);
      u.searchParams.set('code', p.code);
      if (p.ref) u.searchParams.set('ref', p.ref);
      a.setAttribute('href', u.pathname.replace(/^\//, '') + u.search);
    });
  }

  var shown = {};                     // กันเด้งซ้ำในหน้าเดียวกันแม้เขียน storage ไม่ได้

  function markSeen(k) {
    shown[k] = 1;
    try { localStorage.setItem(k, '1'); } catch (e) {}
    try { sessionStorage.setItem(k, '1'); } catch (e) {}
  }

  function wasSeen(k) {
    if (shown[k]) return true;
    try { if (localStorage.getItem(k)) return true; } catch (e) {}
    try { if (sessionStorage.getItem(k)) return true; } catch (e) {}
    return false;
  }

  function sheet(p, vars) {
    var seen = 'ct_promo_seen_' + p.code;
    if (wasSeen(seen)) return;
    shown[seen] = 1;
    var o = document.createElement('div');
    o.className = 'ct-ovl';
    o.innerHTML =
      '<div class="ct-sheet" role="dialog" aria-label="โค้ดส่วนลดของคุณ">' +
        '<button class="ct-x" type="button" aria-label="ปิด"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        (p.label ? stickerEl(p).outerHTML : '') +
        '<div class="ct-h">โค้ดส่วนลดของคุณพร้อมแล้ว</div>' +
        '<p class="ct-sub">ใส่โค้ดให้แล้ว ไม่ต้องพิมพ์เอง</p>' +
        '<div class="ct-ticket">' +
          '<div class="ct-tl"><span>ราคาวันนี้</span><b>' + vars.p + '฿</b><i>ลด ' + vars.cut + '฿ จากราคาปกติ ' + money(SELL) + '฿</i></div>' +
          '<div class="ct-td"></div>' +
          '<div class="ct-tr"><span>โค้ดส่วนลด</span><b>' + p.code + '</b></div>' +
          '<span class="ct-burst"></span>' +
        '</div>' +
        '<div class="ct-meta">' +
          '<div><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>' + (isChat(p) ? 'โอนแล้วรับโค้ดทางอีเมล ปกติใน 1 นาที' : 'ใช้ได้ถึง <b>' + endText(p.ends, true) + '</b>') + '</div>' +
          '<div><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5"/></svg>ใช้กับแพ็ก 1 สิทธิ์ แพ็กทีมราคาปกติ</div>' +
        '</div>' +
        '<button type="button" class="ct-go" id="ctPromoKeep">เก็บโค้ดไว้ใช้</button>' +
        '<p class="ct-fine">เก็บแล้วลดให้อัตโนมัติตอนสั่งซื้อ ไม่ต้องพิมพ์โค้ดเอง</p>' +
      '</div>';
    document.body.appendChild(o);
    document.documentElement.style.overflow = 'hidden';
    burst(o.querySelector('.ct-burst'));

    var closing = false;
    function close() {
      if (closing) return;
      closing = true;
      markSeen(seen);
      document.documentElement.style.overflow = '';
      // ปิดให้ได้ก่อนเสมอ แล้วค่อยเล่นท่าสวย ถ้า animation พังด้วยเหตุใดก็ตาม
      // ป๊อปอัพต้องไม่ค้างคาจอจนลูกค้าปิดไม่ได้
      try { o.classList.add('ct-out'); } catch (e) {}
      setTimeout(function () { o.remove(); }, SLOW ? 0 : 140);
      try { if (!SLOW) collect(o); else land(); } catch (e) { land(); }
    }
    o.querySelector('.ct-x').addEventListener('click', close);
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    o.querySelector('#ctPromoKeep').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }

  // เศษกระดาษโปรยตอนตั๋วลง 8 ชิ้น สีแบรนด์ล้วน เล่นรอบเดียวแล้วลบทิ้ง
  function burst(host) {
    if (!host || SLOW) return;
    var c = ['#D34724', '#EB7D4A', '#F6B58F', '#FFD2B8'];
    for (var i = 0; i < 8; i++) {
      var e = document.createElement('i');
      var a = i / 8 * 6.283 + Math.random() * 0.4;
      var d = 54 + Math.random() * 46;
      e.style.cssText = '--x:' + (Math.cos(a) * d).toFixed(0) + 'px;--y:' + (Math.sin(a) * d - 18).toFixed(0) +
        'px;--r:' + (Math.random() * 360).toFixed(0) + 'deg;background:' + c[i % 4];
      host.appendChild(e);
    }
    setTimeout(function () { host.innerHTML = ''; }, 1600);
  }

  // "เก็บคูปอง": โคลนตั๋วแล้วให้บินไปหุบที่ไอคอนบนแถบโปร
  function collect(o) {
    var t = o.querySelector('.ct-ticket');
    var dot = document.querySelector('.ct-pstrip svg');
    if (!t || !dot) { land(); return; }
    var a = t.getBoundingClientRect(), b = dot.getBoundingClientRect();
    if (typeof t.animate !== 'function') { land(); return; }
    var c = t.cloneNode(true);
    c.querySelector('.ct-burst') && c.querySelector('.ct-burst').remove();
    // ปิด animation ของ .ct-ticket ในตัวโคลน ไม่งั้นมันแย่ง opacity กับท่าบิน
    c.style.cssText = 'animation:none;position:fixed;z-index:301;margin:0;pointer-events:none;transform-origin:0 0;left:' +
      a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px';
    document.body.appendChild(c);
    var gone = false;
    function fin() { if (gone) return; gone = true; c.remove(); land(); }
    c.animate(
      [{ transform: 'none', opacity: 1 },
       { transform: 'translate(' + (b.left - a.left) + 'px,' + (b.top - a.top) + 'px) scale(' + (b.width / a.width).toFixed(3) + ')', opacity: 0.1 }],
      { duration: 460, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }
    ).onfinish = fin;
    // กันตั๋วค้างคาจอถ้าเบราว์เซอร์ไม่เล่น animation (แท็บถูกซ่อน ประหยัดแบต ฯลฯ)
    setTimeout(fin, 900);
  }

  // ราคาถูกสลับเป็นราคาโปรตั้งแต่ตอนป๊อปอัพยังบังอยู่ จังหวะนี้คือตอนที่ตาได้เห็นจริง
  function land() {
    var strip = document.querySelector('.ct-pstrip');
    if (strip && !SLOW) { strip.classList.add('ct-hit'); setTimeout(function () { strip.classList.remove('ct-hit'); }, 1100); }
    if (SLOW) return;
    nextStep();
    ['.price-big', '.price-save', '.sticky-price-main'].forEach(function (sel, i) {
      var el = document.querySelector(sel);
      if (!el) return;
      setTimeout(function () {
        el.classList.add('ct-land');
        setTimeout(function () { el.classList.remove('ct-land'); }, 700);
      }, i * 110);
    });
  }

  // เก็บโค้ดแล้วขั้นต่อไปคือกดสั่งซื้อ วงแหวนกระเพื่อมที่ปุ่ม 2 ครั้งแล้วหยุด
  function nextStep() {
    ['.btn-sticky', '#ct-top .tb-cap'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      el.classList.add('ct-pulse');
      setTimeout(function () { el.classList.remove('ct-pulse'); }, 2600);
    });
  }

  // ใส่สไตล์เฉพาะตอนโหมดโปร คนที่เห็นราคาปกติไม่ต้องโหลดอะไรเพิ่ม
  // (หน้าสั่งซื้อเรียกเองได้ด้วย เพราะช่องกรอกโค้ดต้องมีสไตล์แม้ยังไม่มีโปร)
  window.ctPromoCss = css;

  // ── ช่องกรอกโค้ดเองในหน้าสั่งซื้อ ───────────────────────────────────────
  // ผูกที่ document เพราะโมดูลถูกสร้างใหม่ทุกครั้งที่สถานะเปลี่ยน
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#ctPromoApply'))  return applyTyped(document.getElementById('ctPromoApply'));
    if (t.closest('#ctPromoRemove')) return dropPromo();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'ctPromoInput') {
      e.preventDefault();
      applyTyped(document.getElementById('ctPromoApply'));
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'ctPromoInput') say('');   // พิมพ์ใหม่ = ล้างคำเตือน
  });

  function say(msg) {
    var el = document.getElementById('ctPromoErr');
    if (el) el.textContent = msg;
  }

  function applyTyped(btn) {
    if (!btn || btn.disabled) return;
    var input = document.getElementById('ctPromoInput');
    var c = (input ? input.value : '').trim().toUpperCase();
    if (!c) { say('กรอกโค้ดส่วนลดก่อนนะคะ'); if (input) input.focus(); return; }
    say('');
    btn.disabled = true;
    check(c, function (p, why) {
      btn.disabled = false;
      if (!p) { say(why); if (input) input.focus(); return; }
      window.CT_PROMO = p;
      store(p);
      if (window.ctRenderPrice) window.ctRenderPrice();
      strip(p, money(SELL - p.price));
    });
  }

  function dropPromo() {
    window.CT_PROMO = null;
    store(null);
    var s = document.querySelector('.ct-pstrip');
    if (s) s.remove();
    if (window.ctRenderPrice) window.ctRenderPrice();
  }
  function css() {
    if (document.getElementById('ct-promo-css')) return;
    var s = document.createElement('style');
    s.id = 'ct-promo-css';
    s.textContent = [
      /* แถบโปร: ไล่สีส้มตัวหนังสือขาว แทนแถบประกาศเดิมที่ซ่อนไว้ */
      '.ct-pstrip{position:relative;overflow:hidden;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,#D34724 0%,#EB7D4A 100%);padding:11px 24px}',
      '.ct-pstrip svg{width:18px;height:18px;flex:none;stroke:#fff;fill:none;stroke-width:1.8;margin-left:-4px}',
      '.ct-pstrip p{font-size:13px;line-height:1.6;color:#fff;font-weight:600;margin:0}',
      '.ct-pstrip b{color:#fff;font-weight:800;white-space:nowrap}',
      '.ct-pstrip.ct-hit::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.3) 50%,transparent 70%);transform:translateX(-100%);animation:ctSheen 1s ease-out both}',
      '.ct-pstrip.ct-hit svg{animation:ctTag .6s cubic-bezier(.34,1.56,.64,1)}',
      '@keyframes ctSheen{to{transform:translateX(120%)}}',
      '@keyframes ctTag{40%{transform:scale(1.3) rotate(-14deg)}}',
      '.ct-land{animation:ctLand .5s cubic-bezier(.34,1.56,.64,1) both}',
      '.ct-pulse{position:relative}',
      '.ct-pulse::after{content:"";position:absolute;inset:0;border-radius:inherit;border:2px solid #D34724;pointer-events:none;animation:ctRing 1.1s ease-out 2}',
      '@keyframes ctRing{from{transform:scale(1);opacity:.75}to{transform:scale(1.14);opacity:0}}',
      '@keyframes ctLand{from{transform:scale(1.14);opacity:.4}}',
      '.ct-sticker{display:inline-flex;align-items:baseline;gap:7px;background:linear-gradient(135deg,#fff,#FFF1EA);border:1.5px solid #D34724;border-radius:10px;padding:5px 12px 6px;transform:rotate(-1.6deg);box-shadow:0 2px 0 rgba(211,71,36,.18);margin-bottom:14px}',
      '.ct-sticker b{font-size:17px;font-weight:900;color:#D34724;letter-spacing:-.4px}',
      '.ct-sticker span{font-size:12px;font-weight:700;color:#8A6A5E}',
      /* ป๊อปอัพ */
      '.ct-ovl{position:fixed;inset:0;background:rgba(58,20,10,.46);display:flex;align-items:flex-end;justify-content:center;z-index:300;transition:opacity .14s ease-in}',
      '.ct-ovl.ct-out{opacity:0}',
      '.ct-out .ct-sheet{transform:translateY(24px);opacity:0;transition:.14s ease-in}',
      '.ct-sheet{position:relative;width:100%;max-width:430px;background:#fff;border-radius:22px 22px 0 0;padding:18px 20px 16px;animation:ctUp .42s cubic-bezier(.16,1,.3,1) both}',
      '@keyframes ctUp{from{transform:translateY(28px);opacity:0}}',
      '.ct-sheet>:nth-child(n+2){animation:ctIn .4s cubic-bezier(.22,1,.36,1) both}',
      '.ct-sheet>:nth-child(2){animation-delay:.06s}.ct-sheet>:nth-child(3){animation-delay:.12s}.ct-sheet>:nth-child(4){animation-delay:.18s}',
      '@keyframes ctIn{from{transform:translateY(8px);opacity:0}}',
      '.ct-x{position:absolute;top:10px;right:10px;width:44px;height:44px;border:0;border-radius:50%;background:rgba(0,0,0,.05);display:flex;align-items:center;justify-content:center;cursor:pointer;animation:none!important;z-index:2}',
      '.ct-x svg{width:17px;height:17px;stroke:#6A6A72;stroke-width:2.2;fill:none}',
      '.ct-h{font-size:17px;font-weight:800;line-height:1.5;letter-spacing:-.3px;margin-bottom:4px;color:#0A0A0A}',
      '.ct-sub{font-size:13px;color:#444;line-height:1.7;margin:0 0 14px}',
      /* ตั๋ว: ราคาเป็นพระเอก โค้ดเป็นของรอง เพราะระบบใส่โค้ดให้แล้ว */
      '.ct-ticket{position:relative;display:flex;align-items:stretch;border:1.5px solid rgba(211,71,36,.28);border-radius:16px;overflow:hidden;background:#fff;animation:ctTicket .55s cubic-bezier(.34,1.4,.5,1) .2s both}',
      '@keyframes ctTicket{from{transform:scale(.92) rotate(-1.2deg);opacity:0}}',
      '.ct-ticket::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.7) 50%,transparent 65%);transform:translateX(-120%);animation:ctSheen .9s ease-out .75s both}',
      '.ct-tl{flex:0 0 62%;background:linear-gradient(160deg,#FFF8F5 0%,#FFF0E8 100%);padding:14px 12px;text-align:center}',
      '.ct-tl span{display:block;font-size:13px;font-weight:700;color:#8A6A5E;line-height:1.6}',
      '.ct-tl b{display:block;font-size:40px;font-weight:900;color:#D34724;line-height:1.1;letter-spacing:-1.6px}',
      '.ct-tl i{display:block;font-style:normal;font-size:13px;font-weight:700;color:#8A6A5E;line-height:1.6;margin-top:2px}',
      '.ct-td{width:0;border-left:1.5px dashed rgba(211,71,36,.3)}',
      '.ct-tr{flex:1;padding:13px 10px;text-align:center;display:flex;flex-direction:column;justify-content:center}',
      '.ct-tr span{font-size:13px;font-weight:700;color:#8A6A5E;line-height:1.6}',
      '.ct-tr b{font-size:15px;font-weight:700;letter-spacing:1.2px;color:#8A6A5E;margin-top:3px}',
      '.ct-burst{position:absolute;left:31%;top:46%;width:0;height:0;pointer-events:none;z-index:1}',
      '.ct-burst i{position:absolute;width:7px;height:11px;border-radius:2px;animation:ctPop .9s cubic-bezier(.2,.7,.3,1) .3s both}',
      '@keyframes ctPop{0%{opacity:0}14%{opacity:1}100%{opacity:0;transform:translate(var(--x),calc(var(--y) + 40px)) rotate(var(--r))}}',
      '.ct-meta{display:flex;flex-direction:column;gap:6px;margin:12px 0}',
      '.ct-meta div{display:flex;align-items:center;gap:9px;font-size:13px;color:#444;line-height:1.7}',
      '.ct-meta svg{width:18px;height:18px;flex:none;stroke:#D34724;fill:none;stroke-width:2}',
      '.ct-meta b{font-weight:800;color:#0A0A0A}',
      '.ct-go{position:relative;overflow:hidden;display:block;width:100%;border:0;font-family:inherit;cursor:pointer;background:#D34724;color:#fff;border-radius:100px;padding:15px 24px;font-size:17px;font-weight:800;text-decoration:none;text-align:center;line-height:1.6;transition:transform .12s ease-out}',
      '.ct-fine{font-size:12.5px;color:#6A6A72;line-height:1.7;text-align:center;margin:9px 0 0}',
      '.ct-go:active{transform:scale(.98)}',
      '.ct-go::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.3) 50%,transparent 65%);transform:translateX(-120%);animation:ctSheen .8s ease-out 1.05s both}',
      /* ── โมดูลโค้ดส่วนลด (มีโค้ดแล้ว / ยังไม่มี / โค้ดผิด) ──
         ponytail: ไม่มี selector ไหนอ้างการ์ดสรุปยอด ยกบล็อกนี้ไปวางในตะกร้าได้เลย */
      '.ct-promo{position:relative;padding:12px 18px 14px;border-top:1px solid #EBEBEB;background:#fff}',
      '.ct-promo[data-state="applied"]{overflow:hidden;padding:12px 18px;background:#FFF8F5;animation:ctRow .5s cubic-bezier(.22,1,.36,1) .1s both}',
      '@keyframes ctRow{from{transform:translateY(10px);opacity:0}}',
      '.ct-promo[data-state="applied"]::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 22%,rgba(255,255,255,.8) 50%,transparent 78%);transform:translateX(-110%);animation:ctSheen .9s ease-out .45s both}',
      '.ct-pr{position:relative;display:flex;align-items:center;gap:2px}',
      /* ตั๋วเส้นประ + ติ๊กเขียว: แวบเดียวรู้ว่าเป็นคูปองที่ใช้ไปแล้ว ไม่ใช่สินค้าอีกชิ้น */
      '.ct-tkt{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1.5px dashed rgba(211,71,36,.45);border-radius:9px;background:#fff;font-size:13.5px;font-weight:800;letter-spacing:.9px;color:#D34724;white-space:nowrap;animation:ctTag .55s cubic-bezier(.34,1.56,.64,1) .3s both}',
      '.ct-tkt svg{width:13px;height:13px;flex:none;stroke:#16A34A;fill:none;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}',
      /* ปุ่มเอาโค้ดออก: ไอคอนเล็กแต่พื้นที่กด 44px ตามเป้าแตะมือถือ */
      '.ct-rm{flex:none;width:18px;height:18px;padding:13px;margin:-13px -7px;box-sizing:content-box;border:0;background:none;cursor:pointer;line-height:0}',
      '.ct-rm svg{width:18px;height:18px;stroke:#A98B7E;fill:none;stroke-width:2.2;stroke-linecap:round}',
      '.ct-rm:active svg{stroke:#D34724}',
      '.ct-amt{margin-left:auto;padding-left:8px;font-size:15px;font-weight:800;color:#16A34A;letter-spacing:-.2px;white-space:nowrap;transform-origin:right center;animation:ctLand .45s cubic-bezier(.34,1.56,.64,1) .45s both}',
      '.ct-note{margin:7px 0 0;font-size:12.5px;font-weight:600;color:#76574C;line-height:1.6}',
      /* ยังไม่มีโค้ด: ช่องกรอกเงียบๆ สีอ่อน ไม่แย่งปุ่มสั่งซื้อ */
      '.ct-f{position:relative;display:flex;gap:8px}',
      '.ct-f>svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);width:18px;height:18px;stroke:#C2A79C;fill:none;stroke-width:1.9;pointer-events:none}',
      '.ct-in{flex:1;min-width:0;height:48px;padding:0 12px 0 39px;border:1.5px solid #E3E3E3;border-radius:12px;background:#fff;font-family:inherit;font-size:16px;font-weight:700;letter-spacing:1.1px;color:#0A0A0A;text-transform:uppercase;-webkit-appearance:none;transition:border-color .15s,box-shadow .15s}',
      '.ct-in::placeholder{font-size:14.5px;font-weight:500;letter-spacing:0;color:#9A9A9A;text-transform:none}',
      '.ct-in:focus{outline:none;border-color:#D34724;box-shadow:0 0 0 3px rgba(211,71,36,.13)}',
      '.ct-ap{flex:none;min-width:116px;height:48px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1.5px solid rgba(211,71,36,.38);border-radius:12px;background:#fff;font-family:inherit;font-size:15px;font-weight:800;color:#D34724;cursor:pointer;transition:transform .12s ease-out,background .15s}',
      '.ct-ap:active{transform:scale(.97);background:#FFF8F5}',
      '.ct-ap .ct-bz{display:none;align-items:center;gap:7px;font-size:13.5px}',
      /* กำลังตรวจ: ใส่ disabled อย่างเดียว ปุ่มสลับข้อความเองและกดซ้ำไม่ได้ */
      '.ct-ap[disabled]{color:#9A8880;border-color:#E3E3E3;background:#FAFAFA;cursor:default;transform:none}',
      '.ct-ap[disabled] .ct-apt{display:none}',
      '.ct-ap[disabled] .ct-bz{display:inline-flex}',
      '.ct-sp{width:14px;height:14px;flex:none;border-radius:50%;border:2px solid rgba(154,136,128,.3);border-top-color:#9A8880;animation:ctSpin .6s linear infinite}',
      '@keyframes ctSpin{to{transform:rotate(360deg)}}',
      '.ct-er{margin:8px 0 0;font-size:12.5px;font-weight:600;color:#DC2626;line-height:1.6}',
      '.ct-er:empty{display:none}',
      /* โค้ดผิด/หมดอายุ: ฝั่ง JS ใส่แค่ข้อความ ช่องเปลี่ยนเป็นสีแจ้งเตือนเอง */
      '.ct-promo:has(.ct-er:not(:empty)) .ct-in{border-color:#DC2626;background:#FFFAFA}',
      '.ct-promo:has(.ct-er:not(:empty)) .ct-f>svg{stroke:#E8A0A0}',
      '@media(min-width:1024px){.ct-tkt{font-size:15px;height:32px}.ct-amt{font-size:17px}.ct-note{font-size:13.5px}.ct-in{font-size:17px}.ct-ap{font-size:16px}}',
      '@media(min-width:768px){.ct-pstrip{justify-content:center}.ct-pstrip p{text-align:center}.ct-ovl{align-items:center}.ct-sheet{max-width:470px;padding:26px 30px 22px;border-radius:24px}.ct-tl b{font-size:46px}}',
      /* ลดการเคลื่อนไหว: ไล่สีที่อยู่นิ่งเก็บไว้ได้ ตัดเฉพาะของที่ขยับ */
      '@media(prefers-reduced-motion:reduce){.ct-ovl,.ct-sheet,.ct-sheet>*,.ct-ticket,.ct-ticket::after,.ct-go::after,.ct-pstrip::after,.ct-pstrip svg,.ct-land,.ct-pulse::after,.ct-promo,.ct-promo::before,.ct-tkt,.ct-amt,.ct-ap{animation:none!important;transition:none!important}.ct-burst,.ct-sp{display:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }
})();
