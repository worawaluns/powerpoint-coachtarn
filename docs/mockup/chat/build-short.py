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
# ตัดแถบ 4 ข้อใต้ hero กับแถบลิงก์ section (ซ้ำของที่มีอยู่แล้ว และหน้านี้เหลือ 2 section)
# ⚠️ ห้ามตัดเลย <style> ของ ⑦c ไปด้วย ในนั้นมี CSS ของ section หาสไลด์ ถ้าตัดหน้าจะพังทั้งส่วน
cut('<!-- ★ QUICK FACTS (preview) -->', '<!-- ⑦c PICK BY JOB', 'แถบ 4 ข้อใต้ hero และแถบลิงก์ section')
cut('<!-- ⑦ PARALLAX TEMPLATE STRIP -->', '<section class="pick-section reveal" id="library">', 'แถบสไลด์พารัลแลกซ์')
cut('<section class="section pv-b2b-section"', '<!-- Footer -->', 'ซื้อให้ทีม ใช้ได้กับอะไร ฟีเจอร์ รีวิว 3 ขั้นตอน กล่องราคา คำถามที่พบบ่อย กลุ่มคนที่เหมาะ')

# ── ของที่หน้าแชทต้องไม่มี ───────────────────────────
rep("""try { if ((JSON.parse(localStorage.getItem('ct_lib') || 'null') || {}).code) { document.documentElement.style.display = 'none'; location.replace('templates.html' + location.hash); } } catch (e) {}""", '')
rep('<script src="js/promo.js?v=20261111g"></script>', '<!-- ม็อกอัพ: ราคาคุมด้วยสคริปต์ท้ายไฟล์แทน promo.js -->')
cut('<!-- ② ANNOUNCE BAR', '<!-- ③ HERO -->', 'แถบประกาศที่ซ่อนอยู่')
rep('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    '<meta name="robots" content="noindex,nofollow">\n<base href="/">')

# แถบ Bonus ใน hero -> ป้ายราคาจากแชท (ไม่มีนาฬิกา)
# ก้อนบนสุดเปลืองบรรทัด (ไอซ์ 12 พ.ย.): ยุบ 6 แถวเหลือ 3 แถว h1 / ป้ายแชท+ราคา / ปุ่ม
s = s.replace("""    <div class="hero-price">""", """    <div class="hero-price hero-price--chat">
      <span class="hero-flash chat-flash" id="heroFlash">
        <span class="hf-badge hf-fb"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.14 2 11.24c0 2.9 1.44 5.49 3.68 7.19V22l3.37-1.85c.9.25 1.85.39 2.95.39 5.52 0 10-4.14 10-9.24C22 6.14 17.52 2 12 2zm.99 12.4l-2.53-2.7-4.93 2.7 5.42-5.75 2.6 2.7 4.86-2.7-5.42 5.75z"/></svg></span>
        <span class="hf-txt" id="chatTag">มีคูปองจากแชท</span>
      </span>""")

rep("""    <a href="#bonus" class="hero-flash" id="heroFlash">
      <span class="hf-badge">แถมฟรี</span>
      <span class="hf-txt">Bonus Slides อีก 1 ชุด หมดใน <b id="heroTimer">--:--:--</b></span>
    </a>""",
"""    <div class="hero-flash chat-flash" id="heroFlash">
      <span class="hf-badge hf-fb"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.14 2 11.24c0 2.9 1.44 5.49 3.68 7.19V22l3.37-1.85c.9.25 1.85.39 2.95.39 5.52 0 10-4.14 10-9.24C22 6.14 17.52 2 12 2zm.99 12.4l-2.53-2.7-4.93 2.7 5.42-5.75 2.6 2.7 4.86-2.7-5.42 5.75z"/></svg></span>
      <span class="hf-txt">ราคาพิเศษจากแชท <b id="chatHint">รับคูปองแล้วเหลือ 449฿</b></span>
    </div>""")
# แถวป้ายเดิมไม่ใช้แล้ว (ย้ายไปอยู่ในแถวราคา)
i = s.index('<div class="hero-flash chat-flash" id="heroFlash">')
j = s.index('</div>', s.index('</span>', i)) + 6
s = s[:i] + s[j:]

# แถบติดล่างจอ: เอานาฬิกานับถอยหลังออก
rep("""  <div class="sticky-urgency">""", """  <div class="sticky-urgency" id="stickyNote">""")
i = s.index('<div class="sticky-urgency" id="stickyNote">')
j = s.index('</div>', s.index('<span class="su-timer"', i)) + 6
s = s[:i] + '<div class="sticky-urgency" id="stickyNote">โอนแล้วรับโค้ดทางอีเมล ปกติใน 1 นาที</div>' + s[j:]
rep('รับสไลด์ทันที สั่งเลย', '<span id="stickyBtnTx">สั่งซื้อเลย</span>')

# สคริปต์นับถอยหลังโบนัสไม่ได้ใช้บนหน้านี้ และมันเขียน localStorage ct_bdl ร่วมกับเว็บจริง
cut('/* ── Countdown — single source of truth ── */', '/* ── Features: hover or tap picks one', 'สคริปต์นับถอยหลังโบนัส')  # ⚠️ ห้ามตัดเลยไปถึง revealObs ไม่งั้น section ที่มีคลาส reveal จะไม่โผล่

# หน้านี้ไม่มี footer แล้ว ตัวสังเกตแถบล่างจะ throw แล้วสคริปต์ที่เหลือ (รวม scroll reveal) ไม่ทำงาน
s = s.replace("""}, {threshold:0}).observe(document.querySelector('.footer'));""",
              """}, {threshold:0});   /* หน้าแชทไม่มี footer ไม่ต้องสังเกต */""")

# ลิงก์หน้าสั่งซื้อให้เปิดได้บน localhost
s = s.replace('โอนเงิน · ได้ไฟล์ทางอีเมลทันที · ใช้ง่าย ไม่ต้องเป็นผู้เชี่ยวชาญ',
              'โอนแล้วรับโค้ดทางอีเมล ใช้โหลดไฟล์ได้ทันที')
s = s.replace('href="order"', 'href="order.html"')

# การ์ดตัวอย่างสไลด์: หน้าแรกโชว์ 6 ใบ หน้าแชทเอา 4 พอ ให้ถึงปุ่มซื้อเร็วขึ้น
s = s.replace('<div class="pick-seg"><button class="on" data-m="job">ตามอาชีพ</button><button data-m="type">ตามประเภทสไลด์</button></div>', '')
s = s.replace('เลือกตามอาชีพ หรือตามประเภทสไลด์ หยิบข้ามชุดมารวมกันได้', 'ตัวอย่างจากคลัง 376 ชุด คัดลอกสไลด์จากชุดไหนก็ได้มารวมในไฟล์เดียว')
s = s.replace("mode = 'job', sel = '', shown = 6", "mode = 'job', sel = '', shown = 4")
s = s.replace("shown = 6; render();", "shown = 4; render();")
s = s.replace("$('pickLoad').onclick = () => { shown += 6; grid(); };",
              "$('pickLoad').onclick = () => { shown += 4; grid(); };")

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
    โอนเข้าบัญชี <b>บจก. ดับเบิ้ลคราฟ์ (กสิกรไทย)</b> แล้วแนบสลิปในหน้าสั่งซื้อ<br>ระบบตรวจสลิปอัตโนมัติ ปกติส่งโค้ดเข้าอีเมลภายใน 1 นาที
    <a href="https://m.me/ThePowerpointTemplate" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.14 2 11.24c0 2.9 1.44 5.49 3.68 7.19V22l3.37-1.85c.9.25 1.85.39 2.95.39 5.52 0 10-4.14 10-9.24C22 6.14 17.52 2 12 2zm.99 12.4l-2.53-2.7-4.93 2.7 5.42-5.75 2.6 2.7 4.86-2.7-5.42 5.75z"/></svg>
      ติดปัญหา ทักแชทเพจ
    </a>
  </div>
</section>
"""
rep('<!-- Footer -->', GET + '\n<!-- Footer -->')

# ตัด footer (ไอซ์ 12 พ.ย.: หน้าแชทไม่ต้องมี footer)
cut('<footer class="footer">', '<!-- STICKY BAR -->', 'footer')

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

/* รูปโค้ชตาลกินจอเกือบเต็มหน้า ย่อลงให้ถึงเนื้อหาเร็วขึ้น (ต้องแรงกว่า media query ของหน้าแรก) */
.page .hero-visual{height:236px}
.page .hero-visual .coach-img{height:232px}
/* ป้ายยอดขายเหลือบรรทัดเดียว ไม่ซ้อนสองชั้นใต้ปุ่ม */
.live-pills.ct-inline .lp:nth-child(n+2){display:none}
/* ท้ายหน้าเผื่อที่ให้แถบปุ่มซื้อ ไม่ทับปุ่มปิดท้าย */
.page{padding-bottom:124px}
/* แถบล่างเตี้ยลง คืนพื้นที่จอ */
.sticky-bar{padding-top:6px}
.sticky-bar .sticky-urgency{font-size:12.5px;padding-bottom:4px}

/* ก้อนบนสุดเหลือ 3 แถว: ป้ายแชทมาอยู่แถวเดียวกับราคา บรรทัดรับประกันไปอยู่บนแถบล่างจอ */
.page .hero-h1{line-height:1.08;margin-bottom:12px}
.page .hero-price--chat{display:flex;flex-wrap:nowrap;align-items:center;justify-content:center;gap:8px;margin:0 0 14px}
.page .hero-price--chat .hero-flash{margin:0;padding:3px 10px 3px 3px;gap:6px;flex:0 0 auto}
.page .hero-price--chat .hf-badge{width:22px;height:22px;padding:4px!important}
.page .hero-price--chat .hf-txt{font-size:12px;font-weight:700;color:#0A58B8}
.page .hero-price--chat .price-save{font-size:11px;padding:2px 7px}
.page .hero-btn-row{margin-bottom:12px}
.page .trust-line{display:none}
/* ท้าย section ตัวอย่าง: ปุ่มโปร่งทรงเดียวกับปุ่มหลักแย่งสายตา และลิงก์พาออกนอกหน้า */
.pick-more{padding:4px 20px 16px}
.pick-more button{border:none;background:none;font-family:inherit;font-size:14px;font-weight:700;color:#6B6B6B;text-decoration:underline;text-underline-offset:3px;height:44px}
.pick-more a{display:none}
/* ปุ่มทักแชทต้องขึ้นบรรทัดของตัวเอง ไม่ไปแทรกกลางประโยค */
.cg-pay a{display:flex;width:fit-content}

.chat-get{padding-top:8px}
.cg-list{list-style:none;border:1px solid var(--border);border-radius:16px;padding:6px 16px}
.cg-list li{display:flex;gap:11px;align-items:flex-start;padding:10px 0;font-size:16px;line-height:1.38;font-weight:700}
.cg-list li+li{border-top:1px solid #F2EEEC}
.cg-list li span.cg-tick{flex:none;width:20px;height:20px;margin-top:2px;border-radius:50%;background:#FBD9C9;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D34724' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.4l3.8 3.8L18 8'/%3E%3C/svg%3E");
  background-size:14px;background-position:center;background-repeat:no-repeat}
.cg-list li div span{display:block;font-size:14px;font-weight:500;color:#6B6B6B;margin-top:2px}
.cg-pay{margin-top:12px;padding:12px 14px;border-radius:14px;background:var(--bg-soft);font-size:14px;line-height:1.55;color:var(--text-mid)}
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
.cticket b s{font-size:17px;font-weight:600;color:#A79F9B;margin-left:6px;vertical-align:middle}
.cticket span{display:block;margin-top:7px;font-size:14px;font-weight:700;color:var(--text-mid)}
.csheet .go{width:100%;height:56px;margin-top:18px;border:none;border-radius:14px;font-family:inherit;font-size:18px;font-weight:800;color:#fff;
  background:#C84B2F;cursor:pointer}
.csheet .cx{position:absolute;right:12px;top:12px;width:44px;height:44px;border-radius:50%;border:none;background:#F2EFEE;color:#6B6764;cursor:pointer;display:grid;place-items:center}
.csheet .cx svg{width:17px;height:17px}
/* ก่อนรับคูปองยังไม่ต้องมีแถบล่าง (ใช้คลาส ไม่ใช่ id จะได้ไม่ชนะ html.got-code) */
html:not(.got-code) .sticky-bar{visibility:hidden;transform:translateX(-50%) translateY(110%)}
/* จอแรกต้องมีปุ่มหลักก้อนเดียวที่เป็นสีทึบ ไม่ใช่ปุ่มโปร่งสองอันสีเดียวกัน */
.btn-hero-fill{background:#C84B2F!important;border-color:#C84B2F!important;color:#fff!important;padding:14px 34px;font-size:16px}
.btn-hero-out{color:#6B6B6B!important;font-weight:600;text-decoration:none}
.hero-btn-row{gap:14px}
/* ป้ายยอดขายลอยอยู่ตรงแถบปุ่มซื้อพอดี ดันขึ้นให้พ้นกัน */
body.ct-got .live-pills{bottom:112px}
/* ── จังหวะหลังกดรับโค้ด: ส่งสายตาไปจบที่ปุ่มซื้อ (สเปก motion-master) ── */
.csheet .go{transition:transform .09s var(--ease)}
.csheet .go:active{transform:scale(.97)}
.ovl{transition:opacity .18s linear}
.ovl.out{opacity:0;pointer-events:none}
.ovl.out .csheet{transform:translateY(100%);transition:transform .22s cubic-bezier(.4,0,1,1)}

/* แถบล่างจอ: โผล่แล้วต้องอยู่ ไม่ให้ observer ตาม scroll ดึงกลับลง */
html.got-code .sticky-bar{visibility:visible;transform:translateX(-50%) translateY(0)}
/* ป้ายยอดขายสดของเว็บ: ย้ายมาอยู่ใต้ปุ่มใน hero แทนการลอยทับรูปกับแถบปุ่มซื้อ */
.live-pills.ct-inline{position:static;flex-direction:row;flex-wrap:wrap;justify-content:flex-start;gap:8px;margin:0 0 12px;opacity:1}
.live-pills.ct-inline .lp{opacity:1!important;transform:none!important;font-size:12.5px}
/* ราคาในแถบล่างชิดขอบจอเกินไป */
.sticky-bar .sticky-price-col{padding-left:4px}

/* ราคาเปลี่ยนให้ตาจับได้ โดยเลย์เอาต์ไม่ขยับ */
[data-p1]{display:inline-block}
.discount-badge[data-p1]{display:inline-flex}
[data-p1].p1-swap{animation:p1swap .4s var(--ease) .22s}
@keyframes p1swap{
  0%{opacity:1;transform:scale(1)}
  32%{opacity:.12;transform:scale(1.015)}
  60%{opacity:1;transform:scale(1.05)}
  100%{opacity:1;transform:scale(1)}
}

/* ปุ่มซื้อ: บีตปิดท้ายรอบเดียว ไม่วนซ้ำ */
.btn-sticky.cta-pop{animation:ctapop .28s var(--ease) .38s}
@keyframes ctapop{0%,100%{transform:scale(1)}45%{transform:scale(1.035)}}
.btn-sticky.cta-pop::before{
  content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  border:2px solid rgba(255,255,255,.85);opacity:0;animation:ctaring .36s ease-out .4s;
}
@keyframes ctaring{from{opacity:.55;transform:scale(1)}to{opacity:0;transform:scale(.9)}}
.btn-sticky.cta-pop::before{display:block!important}
/* บรรทัดบนแถบล่างต้องไม่ดันปุ่มตอนสลับข้อความ */
#stickyNote{min-height:20px;transition:opacity .18s ease}
#stickyNote.ct-swap{opacity:0}

@media(prefers-reduced-motion:reduce){
  .ovl,.ovl .csheet,.sticky-bar,.btn-sticky{transition:none!important}
  .csheet,[data-p1].p1-swap,.btn-sticky.cta-pop,.btn-sticky.cta-pop::before{animation:none!important}
}
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
      <u>ราคาหน้าเว็บ 499฿ ลิงก์แชทลดอีก 50฿</u>
      <b>เหลือ 449฿</b>
      <span>โอนแล้วระบบส่งโค้ดเข้าอีเมล ปกติใน 1 นาที</span>
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
    var tag = document.getElementById('chatTag');
    if (tag) tag.textContent = 'ราคาจากแชท';
    document.querySelectorAll('[data-p1]').forEach(function (el) {
      el.textContent = el.getAttribute('data-p1')
        .replace('{p}', PRICE).replace('{full}', LIST).replace('{off}', OFF);
    });
    document.querySelector('.hero').classList.add('got');
    var tag = document.getElementById('chatTag');
    if (tag) tag.textContent = 'ราคาจากแชท';
    var tx = document.getElementById('stickyBtnTx');
    if (tx) tx.textContent = 'สั่งซื้อ ' + PRICE + '฿';
    var n = 0, t = setInterval(function () {
      document.querySelectorAll('#ct-top a, .tb-sheet a').forEach(function (a) {
        if (/สั่งซื้อ 499฿/.test(a.textContent)) a.innerHTML = a.innerHTML.replace('สั่งซื้อ 499฿', 'สั่งซื้อ ' + PRICE + '฿');
      });
      if (++n > 40) clearInterval(t);
    }, 150);
  }
  document.body.classList.add('ct-sheet');
  /* ป้ายยอดขายสด ย้ายเข้ามาในหน้า ไม่ให้ลอยทับอย่างอื่น */
  var mv = 0, mvt = setInterval(function () {
    var pills = document.querySelector('.live-pills');
    if (pills && document.getElementById('get')) {
      pills.classList.add('ct-inline');
      pills.removeAttribute('style');
      var get = document.getElementById('get');
      get.insertBefore(pills, get.firstElementChild);
      clearInterval(mvt);
    }
    if (++mv > 60) clearInterval(mvt);
  }, 200);
  var RM = matchMedia('(prefers-reduced-motion:reduce)').matches;
  function take(animate) {
    try { sessionStorage.setItem('mock_got', '1'); } catch (e) {}
    var ovl = document.getElementById('ovl'), root = document.documentElement,
        btn = document.querySelector('.btn-sticky'), note = document.getElementById('stickyNote');
    document.body.classList.remove('ct-sheet');
    if (!animate || RM) {                       /* กลับเข้าหน้าเดิม หรือปิด motion ไว้ */
      ovl.classList.add('hide'); root.classList.add('got-code'); paint(); return;
    }
    if (note) {
      var normal = note.textContent;
      note.textContent = 'รับส่วนลดแล้ว ' + PRICE + '฿ กดปุ่มส้มสั่งซื้อ';
      setTimeout(function () { note.classList.add('ct-swap'); }, 4300);
      setTimeout(function () { note.textContent = normal; note.classList.remove('ct-swap'); }, 4500);
    }
    document.querySelector('.hero').classList.add('got');   /* ป้ายฟ้าหดตอนยังมีฉากมืดคลุม */
    var go = document.getElementById('cget');
    go.textContent = 'รับส่วนลดแล้ว';
    ovl.classList.add('out');
    document.querySelectorAll('[data-p1]').forEach(function (el) { el.classList.add('p1-swap'); });
    setTimeout(function () { ovl.classList.add('hide'); paint(); }, 350);   /* สลับเลขตอนตัวอักษรจางสุด */
    setTimeout(function () { root.classList.add('got-code'); btn.classList.add('cta-pop'); }, 420);
  }
  document.getElementById('cget').onclick = function () { take(true); };
  document.getElementById('cx').onclick = function () { take(true); };
  var seen = false;
  try { seen = sessionStorage.getItem('mock_got') === '1'; } catch (e) {}
  if (seen || location.search.indexOf('state=got') > -1) take(false);
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
