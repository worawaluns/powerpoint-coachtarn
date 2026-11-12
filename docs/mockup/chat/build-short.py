# -*- coding: utf-8 -*-
"""สร้าง docs/mockup/chat/short.html จาก index.html ตัวจริง
หน้าแชท = หน้าแรกตัดให้เหลือ 2 ส่วนที่ไอซ์สั่ง (HERO + หาสไลด์ที่ตรงกับงานของคุณ)
บวกกล่อง "ซื้อครั้งนี้ได้อะไร" ปุ่มทักแชท และป๊อปอัพคูปอง
รันจากโฟลเดอร์โปรเจกต์: python3 docs/mockup/chat/build-short.py
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3]
s = (ROOT / 'index.html').read_text()

def cut(a, b, label):
    global s
    i = s.index(a); j = s.index(b, i)
    s = s[:i] + '<!-- ตัดออกจากหน้าแชท: %s -->\n' % label + s[j:]

def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)

# ── ตัด section ที่ไม่เอา ─────────────────────────────
cut('<!-- ⑦ PARALLAX TEMPLATE STRIP -->', '<section class="pick-section reveal" id="library">', 'แถบสไลด์พารัลแลกซ์')

# แถบลิงก์ใต้ hero: เหลือเฉพาะ section ที่ยังอยู่
i = s.index('<div class="pv-anchor">'); j = s.index('</div>', s.index('</div>', i) + 6) + 6
s = s[:i] + '''<div class="pv-anchor">
  <div class="pv-anchor-in"><a href="#library" class="on">ตัวอย่างสไลด์</a><a href="#get">ได้อะไรบ้าง</a></div>
</div>''' + s[j:]
cut('<section class="section pv-b2b-section"', '<!-- Footer -->', 'ซื้อให้ทีม ใช้ได้กับอะไร ฟีเจอร์ รีวิว 3 ขั้นตอน กล่องราคา คำถามที่พบบ่อย กลุ่มคนที่เหมาะ')

# ── ของที่หน้าแชทต้องไม่มี ───────────────────────────
rep("""try { if ((JSON.parse(localStorage.getItem('ct_lib') || 'null') || {}).code) { document.documentElement.style.display = 'none'; location.replace('templates.html' + location.hash); } } catch (e) {}""", '')
rep('<script src="js/promo.js?v=20261111g"></script>', '<!-- ม็อกอัพ: ราคาคุมด้วยสคริปต์ท้ายไฟล์แทน promo.js -->')
rep('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    '<meta name="robots" content="noindex,nofollow">\n<base href="/">')

# แถบ Bonus ใน hero -> ป้ายราคาจากแชท (ไม่มีนาฬิกา)
rep("""    <a href="#bonus" class="hero-flash" id="heroFlash">
      <span class="hf-badge">แถมฟรี</span>
      <span class="hf-txt">Bonus Slides อีก 1 ชุด หมดใน <b id="heroTimer">--:--:--</b></span>
    </a>""",
"""    <div class="hero-flash chat-flash" id="heroFlash">
      <span class="hf-badge hf-fb"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.14 2 11.24c0 2.9 1.44 5.49 3.68 7.19V22l3.37-1.85c.9.25 1.85.39 2.95.39 5.52 0 10-4.14 10-9.24C22 6.14 17.52 2 12 2zm.99 12.4l-2.53-2.7-4.93 2.7 5.42-5.75 2.6 2.7 4.86-2.7-5.42 5.75z"/></svg></span>
      <span class="hf-txt">ราคาพิเศษจากแชท <b id="chatHint">รับคูปองแล้วเหลือ 449฿</b></span>
    </div>""")

# แถบติดล่างจอ: เอานาฬิกานับถอยหลังออก
rep("""  <div class="sticky-urgency">""", """  <div class="sticky-urgency" id="stickyNote">""")
i = s.index('<div class="sticky-urgency" id="stickyNote">')
j = s.index('</div>', s.index('<span class="su-timer"', i)) + 6
s = s[:i] + '<div class="sticky-urgency" id="stickyNote">ราคาพิเศษจากแชท ใช้ได้ตลอด ไม่มีวันหมดอายุ</div>' + s[j:]
rep('รับสไลด์ทันที สั่งเลย', '<span id="stickyBtnTx">สั่งซื้อเลย</span>')

# ลิงก์หน้าสั่งซื้อให้เปิดได้บน localhost
s = s.replace('href="order"', 'href="order.html"')

# เมนูในแถบบนเขียนราคาไว้ตายตัว หน้านี้แก้ให้ตรงกับราคาที่ลูกค้าเห็น (ไม่แตะ topbar.js)
# ── กล่อง "ซื้อครั้งนี้ได้อะไร" + ปุ่มทักแชท วางก่อน Footer ──
GET = """
<!-- เพิ่มสำหรับหน้าแชท: ตอบคำถามที่ลูกค้าทดสอบถามก่อนโอน -->
<section class="section chat-get" id="get">
  <h2 class="section-h2" style="text-align:left;margin-bottom:14px">ซื้อครั้งนี้<span class="kw">ได้อะไร</span></h2>
  <ul class="cg-list">
    <li><span class="cg-tick"></span><div>ทุกชุดในคลัง 376 ชุด<span>ไม่ใช่แค่ชุดที่เห็นในหน้านี้ รวม 6,500+ สไลด์</span></div></li>
    <li><span class="cg-tick"></span><div>ไฟล์ .pptx แก้ได้ทุกหน้า<span>PowerPoint 2016 ขึ้นไป ทั้ง Windows และ Mac นำเข้า Google Slides ได้</span></div></li>
    <li><span class="cg-tick"></span><div>โหลดซ้ำได้ไม่จำกัด ไม่มีวันหมดอายุ<span>โค้ดที่ได้ทางอีเมล เอาไปกรอกที่หน้าดาวน์โหลด</span></div></li>
    <li><span class="cg-tick"></span><div>ชุดใหม่ที่เพิ่มเข้าคลัง โหลดฟรี<span>ไม่ต้องจ่ายเพิ่ม ใช้กับงานของคุณและงานลูกค้าได้</span></div></li>
  </ul>
  <div class="cg-pay">
    โอนเข้าบัญชี <b>บจก. ดับเบิ้ลคราฟ์ (กสิกรไทย)</b> แล้วแนบสลิปในหน้าสั่งซื้อ<br>ระบบตรวจสลิปแล้วส่งโค้ดเข้าอีเมลภายใน 1 นาที
    <a href="https://m.me/ThePowerpointTemplate" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.14 2 11.24c0 2.9 1.44 5.49 3.68 7.19V22l3.37-1.85c.9.25 1.85.39 2.95.39 5.52 0 10-4.14 10-9.24C22 6.14 17.52 2 12 2zm.99 12.4l-2.53-2.7-4.93 2.7 5.42-5.75 2.6 2.7 4.86-2.7-5.42 5.75z"/></svg>
      ติดปัญหา ทักแชทเพจ
    </a>
  </div>
</section>
"""
rep('<!-- Footer -->', GET + '\n<!-- Footer -->')

# ── ป๊อปอัพคูปอง + สไตล์เฉพาะหน้านี้ + สคริปต์ราคา ──
EXTRA_CSS = """
<style>
/* ── เฉพาะหน้าราคาพิเศษจากแชท ─────────────────────── */
#ct-top .tb-cap{display:none}            /* มีปุ่มซื้อติดล่างจอแล้ว ไม่ต้องซ้ำ */
.chat-flash{background:#EAF3FF}
.hf-fb{display:inline-flex;align-items:center;gap:5px;background:#0084FF!important;color:#fff!important}
.hf-fb{padding:6px!important;border-radius:50%}
.hf-fb svg{width:16px;height:16px;display:block}
.chat-flash .hf-txt b{font-weight:700;color:#0A58B8}
.hero.got .chat-flash .hf-txt b{display:none}

.chat-get{padding-top:8px}
.cg-list{list-style:none;border:1px solid var(--border);border-radius:16px;padding:6px 16px}
.cg-list li{display:flex;gap:11px;align-items:flex-start;padding:13px 0;font-size:16px;line-height:1.45;font-weight:700}
.cg-list li+li{border-top:1px solid #F2EEEC}
.cg-list li span.cg-tick{flex:none;width:20px;height:20px;margin-top:2px;border-radius:50%;background:#FBD9C9;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D34724' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.4l3.8 3.8L18 8'/%3E%3C/svg%3E");
  background-size:14px;background-position:center;background-repeat:no-repeat}
.cg-list li div span{display:block;font-size:14px;font-weight:500;color:#6B6B6B;margin-top:2px}
.cg-pay{margin-top:14px;padding:14px 16px;border-radius:14px;background:var(--bg-soft);font-size:14px;line-height:1.55;color:var(--text-mid)}
.cg-pay b{font-weight:800;color:var(--text)}
.cg-pay a{display:inline-flex;align-items:center;gap:7px;height:44px;margin-top:10px;padding:0 15px;border-radius:12px;
  border:1px solid #D8DFE6;background:#fff;color:#0084FF;font-size:14px;font-weight:700;text-decoration:none}
.cg-pay a svg{width:15px;height:15px}

.ovl{position:fixed;inset:0;z-index:300;background:rgba(17,17,20,.5);display:flex;align-items:flex-end;justify-content:center;animation:cfade .2s ease}
.ovl.hide{display:none}
.csheet{position:relative;width:100%;max-width:var(--max);background:#fff;border-radius:26px 26px 0 0;
  padding:26px 20px calc(22px + env(safe-area-inset-bottom));text-align:center;animation:cup .36s var(--ease)}
@keyframes cfade{from{opacity:0}}
@keyframes cup{from{transform:translateY(100%)}}
.csheet h3{font-size:18px;font-weight:800;margin-bottom:4px}
.csheet .lead{font-size:14px;color:#6B6B6B;margin-bottom:18px}
.cticket{position:relative;border:1px solid #F3DACD;background:#FFF3EC;border-radius:16px;padding:20px 18px;overflow:hidden}
.cticket::before,.cticket::after{content:'';position:absolute;top:50%;width:18px;height:18px;border-radius:50%;background:#fff;border:1px solid #F3DACD;transform:translateY(-50%)}
.cticket::before{left:-10px}.cticket::after{right:-10px}
.cticket u{display:block;font-size:13px;font-weight:700;color:var(--text-mid);text-decoration:none;margin-bottom:6px}
.cticket b{display:block;font-size:40px;font-weight:900;color:var(--red);line-height:1}
.cticket span{display:block;margin-top:7px;font-size:14px;font-weight:700;color:var(--text-mid)}
.csheet .go{width:100%;height:56px;margin-top:18px;border:none;border-radius:14px;font-family:inherit;font-size:18px;font-weight:800;color:#fff;
  background:linear-gradient(-135deg,var(--grad-start),var(--grad-end));cursor:pointer}
.csheet .cx{position:absolute;right:12px;top:12px;width:44px;height:44px;border-radius:50%;border:none;background:#F2EFEE;color:#6B6764;cursor:pointer;display:grid;place-items:center}
.csheet .cx svg{width:17px;height:17px}
#stickyBar{visibility:hidden}
</style>
"""
rep('</head>', EXTRA_CSS + '</head>')

SHEET = """
<div class="ovl" id="ovl">
  <div class="csheet">
    <button class="cx" id="cx" aria-label="ปิด"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <h3>คูปองจากแชท</h3>
    <p class="lead">ลิงก์นี้มีคูปองติดมาด้วย กดรับก่อนสั่งซื้อ</p>
    <div class="cticket">
      <u>ราคาในเว็บ 499฿ ลด 50฿</u>
      <b>449฿</b>
      <span>ลิงก์นี้ใช้ราคานี้ได้ตลอด ไม่มีวันหมดอายุ</span>
    </div>
    <button class="go" id="cget">รับส่วนลด 50฿</button>
  </div>
</div>
<script>
/* ม็อกอัพ: จำลองสิ่งที่ promo.js ทำบนของจริง (ทาราคาทุกจุดที่มี data-p1) */
(function () {
  var PRICE = 449, FULL = 499, LIST = 999;
  var OFF = Math.round((1 - PRICE / LIST) * 100);
  function paint() {
    document.querySelectorAll('[data-p1]').forEach(function (el) {
      el.textContent = el.getAttribute('data-p1')
        .replace('{p}', PRICE).replace('{full}', LIST).replace('{off}', OFF);
    });
    document.querySelector('.hero').classList.add('got');
    var tx = document.getElementById('stickyBtnTx');
    if (tx) tx.textContent = 'สั่งซื้อ ' + PRICE + '฿';
    var n = 0, t = setInterval(function () {
      document.querySelectorAll('#ct-top a, .tb-sheet a').forEach(function (a) {
        if (/สั่งซื้อ 499฿/.test(a.textContent)) a.innerHTML = a.innerHTML.replace('สั่งซื้อ 499฿', 'สั่งซื้อ ' + PRICE + '฿');
      });
      if (++n > 40) clearInterval(t);
    }, 150);
  }
  function take() {
    try { sessionStorage.setItem('mock_got', '1'); } catch (e) {}
    document.getElementById('ovl').classList.add('hide');
    document.getElementById('stickyBar').style.visibility = 'visible';
    paint();
  }
  document.getElementById('cget').onclick = take;
  document.getElementById('cx').onclick = take;
  var seen = false;
  try { seen = sessionStorage.getItem('mock_got') === '1'; } catch (e) {}
  if (seen || location.search.indexOf('state=got') > -1) take();
  /* ม็อกอัพเท่านั้น: ?y=1200 ไว้ถ่ายรูปหน้าจอตอนเลื่อนลงมา */
  /* ม็อกอัพเท่านั้น: ?shot=1 บังคับให้ทุกอย่างโผล่ ใช้ตอนถ่ายรูปด้วย headless chrome */
  if (location.search.indexOf('shot=1') > -1) {
    var st = document.createElement('style');
    st.textContent = '.reveal{opacity:1!important;transform:none!important}' +
      '*,*::before,*::after{animation:none!important;transition:none!important}';
    document.head.appendChild(st);
    setInterval(function () {
      document.querySelectorAll('img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; });
      document.querySelectorAll('.reveal').forEach(function (e) { e.classList.add('visible'); });
    }, 200);
  }
  var to = new URLSearchParams(location.search).get('to');
  if (to) {
    document.documentElement.style.scrollBehavior = 'auto';
    [200, 900, 2000, 3500, 5000].forEach(function (ms) {
      setTimeout(function () {
        var el = document.getElementById(to);
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70);
      }, ms);
    });
  }
})();
</script>
"""
rep('</body>', SHEET + '</body>')

out = ROOT / 'docs/mockup/chat/short.html'
out.write_text(s)
print('wrote', out, len(s), 'bytes')
