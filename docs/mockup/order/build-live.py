#!/usr/bin/env python3
"""สร้าง order-mockup.html (หน้าตัวอย่างบนเว็บจริง) จาก docs/mockup/order/after.html
แก้ที่ after.html ที่เดียว แล้วรัน: python3 docs/mockup/order/build-live.py"""
import io, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
src  = os.path.join(ROOT, 'docs/mockup/order/after.html')
dst  = os.path.join(ROOT, 'order-mockup.html')
s = io.open(src, encoding='utf-8').read()

s = s.replace('<title>หน้าสั่งซื้อ แบบใหม่ (mockup)</title>',
 '<title>หน้าสั่งซื้อ (ตัวอย่าง) · Coach Tarn</title>\n'
 '<meta name="robots" content="noindex,nofollow">\n'
 '<link rel="icon" type="image/x-icon" href="img/favicon.ico">')

# โลโก้ รูปสินค้า และโลโก้ธนาคารชุดเดียวกับหน้าจริง
s = s.replace('.nav-logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px}\n'
              '.nav-mark{width:26px;height:26px;border-radius:7px;background:var(--red);display:block}',
              '.nav-logo{display:flex;align-items:center;text-decoration:none}\n'
              '.nav-logo img{height:34px;width:auto;display:block}')
s = s.replace('<div class="nav-logo"><span class="nav-mark"></span>coach tarn</div>',
              '<a class="nav-logo" href="/"><img src="img/logo.svg" alt="Coach Tarn"></a>')
s = s.replace('.item-th{width:52px;height:38px;border-radius:8px;background:#E9E9EE;flex:none}',
              '.item-th{width:52px;height:38px;border-radius:8px;background:#E9E9EE;flex:none;overflow:hidden}\n'
              '.item-th img{width:100%;height:100%;object-fit:cover;display:block}')
for thumb, name in (('thumbnails-template', 'สไลด์ PowerPoint โหลดไม่จำกัด'),
                    ('thumbnails-bonus-slide', 'Bonus Slides')):
    s = s.replace('<div class="item-th"></div>\n      <div style="flex:1">\n        <div class="item-nm">' + name + '</div>',
                  '<div class="item-th"><img src="img/%s.png" alt=""></div>\n      <div style="flex:1">\n        <div class="item-nm">%s</div>' % (thumb, name))
s = s.replace('<span class="bank-v"><span class="kbank"></span>กสิกรไทย</span>',
              '<span class="bank-v" style="display:flex;align-items:center;gap:7px;justify-content:flex-end">'
              '<img src="img/kbank-logo.webp" alt="KBANK" style="width:22px;height:22px;border-radius:6px;object-fit:contain;flex:none">กสิกรไทย</span>')

# คอลัมน์สำหรับจอใหญ่
s = s.replace('<!-- ① สรุปรายการ -->\n  <div class="card">', '<!-- ① สรุปรายการ -->\n  <div class="card col-l">')
s = s.replace('<!-- ② บัญชีที่ต้องโอน -->\n  <div class="card">', '<!-- ② บัญชีที่ต้องโอน -->\n  <div class="card col-l">')
s = s.replace('<!-- ③ ฟอร์ม -->\n  <div class="card">', '<!-- ③ ฟอร์ม -->\n  <div class="card col-r">')

RESPONSIVE = '''
/* ── แท็บเล็ตกับเดสก์ท็อป ──
   หน้าจริงตอนนี้เป็นมือถืออย่างเดียว กว้าง 430 แล้วเหลือขอบขาวโล่งสองข้างบนคอม
   แท็บเล็ต: คอลัมน์เดียวแต่กว้างขึ้นและตัวโตขึ้น
   เดสก์ท็อป: ของที่อ่านอย่างเดียว (รายการ + บัญชี) ไว้ซ้าย ฟอร์มไว้ขวาและตรึงไว้ จะได้ไม่ต้องเลื่อนขึ้นลงหาเลขบัญชี */
@media (min-width:760px){
  .wrap{max-width:620px;padding:0 24px 56px}
  .nav{padding:18px 0 14px}
  .nav-logo img{height:40px}
  .card-h{font-size:16.5px}
  .item-nm{font-size:15px}
  .total-p{font-size:26px}
  .bank-v.big{font-size:18px}
  .up2 b{font-size:15.5px}
  .inp{font-size:16px}
  .btn{font-size:18px}
}
@media (min-width:1080px){
  .wrap{
    max-width:1060px;display:grid;gap:22px 26px;align-items:start;
    grid-template-columns:minmax(0,1fr) minmax(0,452px);padding:0 28px 70px;
  }
  .nav{grid-column:1 / -1}
  .col-l{grid-column:1;margin:0 0 0}
  .col-r{grid-column:2;grid-row:2 / span 2;position:sticky;top:22px;margin:0}
  .tax,.job{margin-left:16px;margin-right:16px}
  .total-p{font-size:28px}
}
'''
s = s.replace('\n</style>', RESPONSIVE + '</style>')
s = s.replace('<p class="tagline">mockup เทียบของเดิม ยังไม่ได้แก้หน้าจริง</p>',
              '<p class="tagline">หน้าตัวอย่าง ยังไม่ได้แก้หน้าสั่งซื้อจริง ปุ่มทุกปุ่มในหน้านี้ไม่ได้ส่งข้อมูลไปไหน</p>')
io.open(dst, 'w', encoding='utf-8').write(s)
print('wrote', dst, len(s), 'bytes')
