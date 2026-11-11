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
  var FULL = 499;            // ราคาเต็มแพ็ก 1 สิทธิ์ — ลดเฉพาะแพ็กนี้ แพ็กทีมไม่เกี่ยว
  var SAVE = 'ct_promo';

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
  else ready(false);

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

  // fromLink = เพิ่งกดลิงก์โปรเข้ามารอบนี้ (ใช้ตัดสินว่าจะเด้งป๊อปอัพไหม)
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
    var off  = Math.round((1 - p.price / FULL) * 100);
    var cut  = FULL - p.price;
    var vars = { p: money(p.price), full: money(FULL), off: off, cut: money(cut) };

    css();

    // ราคาในหน้า — จุดที่ต้องเปลี่ยนมี data-p1 กำกับไว้ในไฟล์ HTML
    document.querySelectorAll('[data-p1]').forEach(function (el) {
      el.textContent = el.getAttribute('data-p1').replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; });
    });

    strip(p, cut);
    sticker(p);
    links(p);
    buyText(p);
    if (fromLink) sheet(p, off, cut);
  }

  // แถบโปรใต้แถบบน มีที่เดียวในหน้า ประโยคเดียวบอกครบว่าลดเท่าไหร่ ลดอะไร หมดเมื่อไหร่
  function strip(p, cut) {
    var host = document.getElementById('ct-top');
    if (!host || document.querySelector('.ct-pstrip')) return;
    var d = document.createElement('div');
    d.className = 'ct-pstrip';
    d.innerHTML = TAG + '<p>ใส่โค้ดส่วนลด <b>' + p.code + '</b> ให้แล้ว ลด <b>' + money(cut) +
      '฿</b> ถึง <b>' + endText(p.ends, true) + '</b></p>';
    host.parentNode.insertBefore(d, host.nextSibling);
  }

  function sticker(p) {
    var hero = document.querySelector('.hero-inner');
    if (!hero || !p.label || document.querySelector('.ct-sticker')) return;
    var parts = p.label.split(' ');
    var d = document.createElement('div');
    d.className = 'ct-sticker';
    d.innerHTML = '<b>' + parts[0] + '</b>' + (parts.length > 1 ? '<span>' + parts.slice(1).join(' ') + '</span>' : '');
    hero.insertBefore(d, hero.firstElementChild);
  }

  // ปุ่มสั่งซื้อบนแถบบนกับในเมนู topbar.js เป็นคนสร้าง ไม่มี data-p1 ให้แก้
  // เลยตามแก้ข้อความทีหลัง และเฝ้าไว้เผื่อเมนูถูกสร้างตอนกด
  function buyText(p) {
    var want = 'สั่งซื้อ ' + money(p.price) + '฿';
    function fix() {
      document.querySelectorAll('a,button').forEach(function (el) {
        if (el.children.length === 0 && el.textContent.trim() === 'สั่งซื้อ ' + money(FULL) + '฿') el.textContent = want;
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

  function sheet(p, off, cut) {
    var seen = 'ct_promo_seen_' + p.code;
    try { if (localStorage.getItem(seen)) return; } catch (e) {}
    var buy = 'order?code=' + encodeURIComponent(p.code) + (p.ref ? '&ref=' + encodeURIComponent(p.ref) : '');
    var o = document.createElement('div');
    o.className = 'ct-ovl';
    o.innerHTML =
      '<div class="ct-sheet" role="dialog" aria-label="โค้ดส่วนลดของคุณ">' +
        '<button class="ct-x" type="button" aria-label="ปิด"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '<div class="ct-sticker">' + (p.label ? '<b>' + p.label.split(' ')[0] + '</b><span>' + p.label.split(' ').slice(1).join(' ') + '</span>' : '') + '</div>' +
        '<div class="ct-h">โค้ดส่วนลดของคุณพร้อมแล้ว</div>' +
        '<p class="ct-sub">ใส่โค้ดส่วนลดให้แล้ว ไม่ต้องกดรับและไม่ต้องพิมพ์เอง</p>' +
        '<div class="ct-ticket">' +
          '<div class="ct-tl"><span>จ่ายเพียง</span><b>' + money(p.price) + '฿</b><i>ลด ' + money(cut) + '฿ จาก ' + money(FULL) + '฿</i></div>' +
          '<div class="ct-td"></div>' +
          '<div class="ct-tr"><span>โค้ดส่วนลด</span><b>' + p.code + '</b></div>' +
        '</div>' +
        '<div class="ct-meta">' +
          '<div><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>ใช้ได้ถึง <b>' + endText(p.ends, true) + '</b></div>' +
          '<div><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5"/></svg>ใช้กับแพ็ก 1 สิทธิ์ แพ็กทีมราคาปกติ</div>' +
        '</div>' +
        '<a class="ct-go" href="' + buy + '">สั่งซื้อราคาโปร ' + money(p.price) + '฿</a>' +
        '<p class="ct-fine">เก็บลิงก์นี้ไว้ เปิดอีกครั้งเมื่อไหร่ก็ได้ส่วนลดเหมือนเดิม จนถึง ' + endText(p.ends, true) + '</p>' +
      '</div>';
    document.body.appendChild(o);
    document.documentElement.style.overflow = 'hidden';
    function close() {
      o.remove();
      document.documentElement.style.overflow = '';
      try { localStorage.setItem(seen, '1'); } catch (e) {}
    }
    o.querySelector('.ct-x').addEventListener('click', close);
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }

  // ใส่สไตล์เฉพาะตอนโหมดโปร คนที่เห็นราคาปกติไม่ต้องโหลดอะไรเพิ่ม
  function css() {
    if (document.getElementById('ct-promo-css')) return;
    var s = document.createElement('style');
    s.id = 'ct-promo-css';
    s.textContent = [
      '.ct-pstrip{display:flex;align-items:center;gap:10px;background:#FFF8F5;border-top:1px solid rgba(211,71,36,.14);border-bottom:1px solid rgba(211,71,36,.14);padding:10px 16px}',
      '.ct-pstrip svg{width:18px;height:18px;flex:none;stroke:#D34724;fill:none;stroke-width:1.8}',
      '.ct-pstrip p{font-size:13.5px;line-height:1.65;color:#6B4A3E;font-weight:600;margin:0}',
      '.ct-pstrip b{color:#D34724;font-weight:800;white-space:nowrap}',
      '.ct-sticker{display:inline-flex;align-items:baseline;gap:7px;background:#fff;border:1.5px solid #D34724;border-radius:10px;padding:5px 12px 6px;transform:rotate(-1.6deg);box-shadow:0 2px 0 rgba(211,71,36,.18);margin-bottom:14px}',
      '.ct-sticker b{font-size:17px;font-weight:900;color:#D34724;letter-spacing:-.4px}',
      '.ct-sticker span{font-size:12px;font-weight:700;color:#8A6A5E}',
      '.ct-ovl{position:fixed;inset:0;background:rgba(10,10,10,.5);display:flex;align-items:flex-end;justify-content:center;z-index:300}',
      '.ct-sheet{position:relative;width:100%;max-width:430px;background:#fff;border-radius:22px 22px 0 0;padding:18px 20px 16px;animation:ctUp .28s cubic-bezier(.22,1,.36,1) both}',
      '@keyframes ctUp{from{transform:translateY(14px);opacity:.6}to{transform:none;opacity:1}}',
      '@media(prefers-reduced-motion:reduce){.ct-sheet{animation:none}}',
      '.ct-x{position:absolute;top:10px;right:10px;width:44px;height:44px;border:0;border-radius:50%;background:rgba(0,0,0,.05);display:flex;align-items:center;justify-content:center;cursor:pointer}',
      '.ct-x svg{width:17px;height:17px;stroke:#6A6A72;stroke-width:2.2;fill:none}',
      '.ct-h{font-size:19px;font-weight:900;line-height:1.5;letter-spacing:-.4px;margin-bottom:6px;color:#0A0A0A}',
      '.ct-sub{font-size:13px;color:#444;line-height:1.7;margin:0 0 14px}',
      '.ct-ticket{display:flex;align-items:stretch;border:1.5px solid rgba(211,71,36,.28);border-radius:16px;overflow:hidden;background:#fff}',
      '.ct-tl{flex:0 0 48%;background:#FFF8F5;padding:12px;text-align:center}',
      '.ct-tl span{display:block;font-size:12.5px;font-weight:700;color:#8A6A5E;line-height:1.6}',
      '.ct-tl b{display:block;font-size:32px;font-weight:900;color:#D34724;line-height:1.15;letter-spacing:-1.2px}',
      '.ct-tl i{display:block;font-style:normal;font-size:12.5px;font-weight:700;color:#8A6A5E;line-height:1.6;margin-top:2px}',
      '.ct-td{width:0;border-left:1.5px dashed rgba(211,71,36,.3)}',
      '.ct-tr{flex:1;padding:13px 10px;text-align:center;display:flex;flex-direction:column;justify-content:center}',
      '.ct-tr span{font-size:12.5px;font-weight:700;color:#6A6A72;line-height:1.6}',
      '.ct-tr b{font-size:21px;font-weight:900;letter-spacing:1.6px;color:#0A0A0A;margin-top:3px}',
      '.ct-meta{display:flex;flex-direction:column;gap:6px;margin:12px 0}',
      '.ct-meta div{display:flex;align-items:center;gap:9px;font-size:13.5px;color:#444;line-height:1.7}',
      '.ct-meta svg{width:18px;height:18px;flex:none;stroke:#D34724;fill:none;stroke-width:2}',
      '.ct-meta b{font-weight:800;color:#0A0A0A}',
      '.ct-go{display:block;background:#D34724;color:#fff;border-radius:100px;padding:15px 24px;font-size:16px;font-weight:800;text-decoration:none;text-align:center;line-height:1.6}',
      '.ct-fine{font-size:12.5px;color:#6A6A72;line-height:1.7;text-align:center;margin:9px 0 0}',
      '.ct-dsc{display:flex;align-items:center;gap:11px;padding:13px 18px;border-top:1px solid #EBEBEB}',
      '.ct-dsc .ct-ic{width:44px;height:44px;border-radius:8px;flex:none;background:#FFF8F5;display:flex;align-items:center;justify-content:center}',
      '.ct-dsc .ct-ic svg{width:21px;height:21px;stroke:#D34724;fill:none;stroke-width:1.7}',
      '.ct-dsc .ct-i{flex:1}',
      '.ct-dsc .ct-i b{display:block;font-size:14px;font-weight:700;line-height:1.6;color:#0A0A0A}',
      '.ct-dsc .ct-i span{display:block;font-size:13px;color:#6A6A72;line-height:1.65;margin-top:1px}',
      '.ct-dsc .ct-amt{font-size:14px;font-weight:800;color:#16A34A;flex:none;text-align:right}',
      '.ct-np{display:block;font-size:13px;color:#6A6A72;font-weight:500;line-height:1.7;margin-top:2px}',
      '@media(min-width:768px){.ct-pstrip{justify-content:center}.ct-pstrip p{text-align:center}.ct-ovl{align-items:center}.ct-sheet{max-width:420px;border-radius:22px}}'
    ].join('\n');
    document.head.appendChild(s);
  }
})();
