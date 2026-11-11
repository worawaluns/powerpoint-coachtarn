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
    fetch(API + '/rest/v1/promo_codes?select=code,discount_price,label,starts_at,ends_at&code=eq.' + encodeURIComponent(c), {
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON }
    })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        var p = rows && rows[0];                // RLS คืนมาแค่โค้ดที่ active
        var now = Date.now();
        // ยังไม่ถึงวันเริ่ม หรือหมดเขตแล้ว = หน้าแรกปกติ ไม่บอกว่ามีโปร
        if (!p || now < Date.parse(p.starts_at) || now > Date.parse(p.ends_at)) return ready(false);
        window.CT_PROMO = { code: p.code, price: +p.discount_price, label: p.label, ends: p.ends_at, ref: ref };
        store(window.CT_PROMO);
        ready(true);
      })
      .catch(function () { ready(false); });
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
    d.innerHTML = TAG + '<p>ใส่โค้ด <b>' + p.code + '</b> ให้แล้ว ลดเพิ่มอีก <b>' + cut +
      '฿</b> ถึง <b>' + endText(p.ends, false) + '</b></p>';
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

  function sheet(p, vars) {
    var seen = 'ct_promo_seen_' + p.code;
    try { if (localStorage.getItem(seen)) return; } catch (e) {}
    var buy = 'order?code=' + encodeURIComponent(p.code) + (p.ref ? '&ref=' + encodeURIComponent(p.ref) : '');
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
          '<div><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>ใช้ได้ถึง <b>' + endText(p.ends, true) + '</b></div>' +
          '<div><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5"/></svg>ใช้กับแพ็ก 1 สิทธิ์ แพ็กทีมราคาปกติ</div>' +
        '</div>' +
        '<a class="ct-go" href="' + buy + '">สั่งซื้อเลย</a>' +
      '</div>';
    document.body.appendChild(o);
    document.documentElement.style.overflow = 'hidden';
    burst(o.querySelector('.ct-burst'));

    var closing = false;
    function close() {
      if (closing) return;
      closing = true;
      try { localStorage.setItem(seen, '1'); } catch (e) {}
      document.documentElement.style.overflow = '';
      if (SLOW) { o.remove(); land(); return; }
      collect(o);                      // ตั๋วบินไปเก็บที่แถบโปร แล้วราคาค่อยลงจอด
      o.classList.add('ct-out');
      setTimeout(function () { o.remove(); }, 200);
    }
    o.querySelector('.ct-x').addEventListener('click', close);
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
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
    var c = t.cloneNode(true);
    c.querySelector('.ct-burst') && c.querySelector('.ct-burst').remove();
    c.style.cssText = 'position:fixed;z-index:301;margin:0;pointer-events:none;transform-origin:0 0;left:' +
      a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px';
    document.body.appendChild(c);
    c.animate(
      [{ transform: 'none', opacity: 1 },
       { transform: 'translate(' + (b.left - a.left) + 'px,' + (b.top - a.top) + 'px) scale(' + (b.width / a.width).toFixed(3) + ')', opacity: 0.1 }],
      { duration: 460, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }
    ).onfinish = function () { c.remove(); land(); };
  }

  // ราคาถูกสลับเป็นราคาโปรตั้งแต่ตอนป๊อปอัพยังบังอยู่ จังหวะนี้คือตอนที่ตาได้เห็นจริง
  function land() {
    var strip = document.querySelector('.ct-pstrip');
    if (strip && !SLOW) { strip.classList.add('ct-hit'); setTimeout(function () { strip.classList.remove('ct-hit'); }, 1100); }
    if (SLOW) return;
    ['.price-big', '.price-save', '.sticky-price-main'].forEach(function (sel, i) {
      var el = document.querySelector(sel);
      if (!el) return;
      setTimeout(function () {
        el.classList.add('ct-land');
        setTimeout(function () { el.classList.remove('ct-land'); }, 700);
      }, i * 110);
    });
  }

  // ใส่สไตล์เฉพาะตอนโหมดโปร คนที่เห็นราคาปกติไม่ต้องโหลดอะไรเพิ่ม
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
      '@keyframes ctLand{from{transform:scale(1.14);opacity:.4}}',
      '.ct-sticker{display:inline-flex;align-items:baseline;gap:7px;background:linear-gradient(135deg,#fff,#FFF1EA);border:1.5px solid #D34724;border-radius:10px;padding:5px 12px 6px;transform:rotate(-1.6deg);box-shadow:0 2px 0 rgba(211,71,36,.18);margin-bottom:14px}',
      '.ct-sticker b{font-size:17px;font-weight:900;color:#D34724;letter-spacing:-.4px}',
      '.ct-sticker span{font-size:12px;font-weight:700;color:#8A6A5E}',
      /* ป๊อปอัพ */
      '.ct-ovl{position:fixed;inset:0;background:rgba(58,20,10,.46);display:flex;align-items:flex-end;justify-content:center;z-index:300;transition:opacity .2s ease-in}',
      '.ct-ovl.ct-out{opacity:0}',
      '.ct-out .ct-sheet{transform:translateY(24px);opacity:0;transition:.2s ease-in}',
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
      '.ct-go{position:relative;overflow:hidden;display:block;background:#D34724;color:#fff;border-radius:100px;padding:15px 24px;font-size:17px;font-weight:800;text-decoration:none;text-align:center;line-height:1.6;transition:transform .12s ease-out}',
      '.ct-go:active{transform:scale(.98)}',
      '.ct-go::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.3) 50%,transparent 65%);transform:translateX(-120%);animation:ctSheen .8s ease-out 1.05s both}',
      /* แถวส่วนลดในหน้าสั่งซื้อ */
      '.ct-dsc{position:relative;overflow:hidden;display:flex;align-items:center;gap:11px;padding:14px 18px;border-top:1px solid #EBEBEB;animation:ctRow .5s cubic-bezier(.22,1,.36,1) .15s both}',
      '@keyframes ctRow{from{transform:translateY(8px);opacity:0}}',
      '.ct-dsc::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(235,125,74,.16),transparent 70%);transform:translateX(-100%);animation:ctSheen .9s ease-out .5s both}',
      '.ct-dsc .ct-ic{width:44px;height:44px;border-radius:8px;flex:none;background:#FFF8F5;display:flex;align-items:center;justify-content:center;animation:ctTag .6s cubic-bezier(.34,1.56,.64,1) .45s both}',
      '.ct-dsc .ct-ic svg{width:21px;height:21px;stroke:#D34724;fill:none;stroke-width:1.7}',
      '.ct-dsc .ct-i{flex:1;position:relative}',
      '.ct-dsc .ct-i b{display:block;font-size:14px;font-weight:700;line-height:1.6;color:#0A0A0A}',
      '.ct-dsc .ct-i span{display:block;font-size:13px;color:#6A6A72;line-height:1.65;margin-top:1px}',
      '.ct-dsc .ct-amt{position:relative;font-size:14px;font-weight:800;color:#16A34A;flex:none;text-align:right;transform-origin:right center;animation:ctLand .45s cubic-bezier(.34,1.56,.64,1) .6s both}',
      '@media(min-width:768px){.ct-pstrip{justify-content:center}.ct-pstrip p{text-align:center}.ct-ovl{align-items:center}.ct-sheet{max-width:470px;padding:26px 30px 22px;border-radius:24px}.ct-tl b{font-size:46px}}',
      /* ลดการเคลื่อนไหว: ไล่สีที่อยู่นิ่งเก็บไว้ได้ ตัดเฉพาะของที่ขยับ */
      '@media(prefers-reduced-motion:reduce){.ct-ovl,.ct-sheet,.ct-sheet>*,.ct-ticket,.ct-ticket::after,.ct-go::after,.ct-pstrip::after,.ct-pstrip svg,.ct-land,.ct-dsc,.ct-dsc::before,.ct-dsc .ct-ic,.ct-dsc .ct-amt{animation:none!important;transition:none!important}.ct-burst{display:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }
})();
