#!/usr/bin/env python3
"""สร้าง order-mockup.html (หน้าตัวอย่างบนเว็บจริง) จาก docs/mockup/order/after.html
แก้ที่ after.html ที่เดียว แล้วรัน: python3 docs/mockup/order/build-live.py"""
import io, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
src  = os.path.join(ROOT, 'docs/mockup/order/after.html')
dst  = os.path.join(ROOT, 'order-mockup.html')
s = io.open(src, encoding='utf-8').read()


def sub(old, new, count=1):
    """แทนที่แล้วเช็กว่าเจอจริง ถ้า after.html ขยับโครงสร้าง จะได้รู้ตอนรัน ไม่ใช่ตอนขึ้นเว็บ"""
    global s
    found = s.count(old)
    assert found == count, 'หาไม่เจอหรือเจอเกิน (%d ครั้ง): %s' % (found, old[:70])
    s = s.replace(old, new)


sub('<title>หน้าสั่งซื้อ แบบใหม่ (mockup)</title>',
    '<title>หน้าสั่งซื้อ (ตัวอย่าง) · Coach Tarn</title>\n'
    '<meta name="robots" content="noindex,nofollow">\n'
    '<link rel="icon" type="image/x-icon" href="img/favicon.ico">')

# รูปสินค้ากับโลโก้ธนาคารชุดเดียวกับหน้าจริง (โลโก้บนแถบบนมาจาก topbar.js)
sub('.foot-mark span{width:24px;height:24px;border-radius:7px;background:var(--red);display:block}',
    '.foot-mark img{height:28px;width:auto;display:block;filter:brightness(0) invert(1)}')
sub('<div class="foot-mark"><span></span>coach tarn</div>',
    '<div class="foot-mark"><img src="img/logo.svg" alt="Coach Tarn"></div>')
sub('.item-th{width:52px;height:38px;border-radius:var(--r-sm);background:#E9E9EE;flex:none}',
    '.item-th{width:52px;height:38px;border-radius:var(--r-sm);background:#E9E9EE;flex:none;overflow:hidden}\n'
    '.item-th img{width:100%;height:100%;object-fit:cover;display:block}')
for thumb, name in (('thumbnails-template', 'สไลด์ PowerPoint โหลดไม่จำกัด'),
                    ('thumbnails-bonus-slide', 'Bonus Slides')):
    sub('<div class="item-th"></div>\n      <div style="flex:1">\n        <div class="item-nm">' + name + '</div>',
        '<div class="item-th"><img src="img/%s.png" alt=""></div>\n      <div style="flex:1">\n        <div class="item-nm">%s</div>' % (thumb, name))
sub('<div class="bank-top"><span class="kbank"></span>',
    '<div class="bank-top"><img class="kbank" src="img/kbank-logo.webp" alt="KBANK" style="object-fit:contain;background:#fff">')

# คลาสสำหรับเลย์เอาต์สองคอลัมน์บนจอใหญ่ (บนมือถือ .col-left เป็น div ธรรมดา ไม่มีผล)
sub('<!-- ① สรุปรายการ -->\n  <div class="card">',
    '<div class="col-left">\n  <!-- ① สรุปรายการ -->\n  <div class="card ord">')
sub('<div class="card plain" id="bankCard">', '<div class="card plain bnk" id="bankCard">')
sub('<div class="trust" id="trustRow">', '<div class="trust trst" id="trustRow">')
sub('  <!-- ③ ฟอร์ม -->', '  </div>\n\n  <!-- ③ ฟอร์ม -->')
sub('<div class="card" id="formCard">', '<div class="card col-r" id="formCard">')
sub('<div class="card done-card" id="doneCard" hidden>', '<div class="card done-card col-r" id="doneCard" hidden>')

RESPONSIVE = '''
/* ── แท็บเล็ตกับเดสก์ท็อป ──
   แท็บเล็ต: คอลัมน์เดียวแต่กว้างขึ้นและตัวโตขึ้น
   เดสก์ท็อป: ของที่อ่านอย่างเดียว (บัญชี + รายการ) ไว้ซ้าย ฟอร์มไว้ขวาและตรึงไว้
   การ์ดบัญชีอยู่บนสุดของคอลัมน์ซ้าย เพราะบนคอมคนเปิดแอปธนาคารบนมือถืออีกเครื่อง
   ต้องมองเลขบัญชีค้างไว้ตลอดเวลาที่กรอกฟอร์ม */
@media (min-width:760px){
  .wrap{max-width:620px;padding:0 24px 56px}
  .card-h{font-size:16.5px}
  .item-nm{font-size:15px}
  .total-p{font-size:26px}
  .btn{font-size:18px}
  .dock{display:none}          /* จอยาวพอ ปุ่มในหน้าเห็นอยู่แล้ว ไม่ต้องมีแถบติดล่าง */
  .tagline{padding-bottom:0}
}
@media (min-width:1080px){
  .wrap{
    max-width:1060px;display:grid;gap:16px 26px;align-items:start;
    grid-template-columns:minmax(0,1fr) minmax(0,452px);padding:0 28px 70px;
    align-content:start;grid-auto-rows:min-content;
  }
  #ct-top{grid-column:1 / -1;grid-row:1}
  /* คอลัมน์ซ้ายเป็นกล่องเดียวแล้วเรียงข้างในเอง ถ้าแยกเป็นหลายแถวของ grid
     แถวจะถูกยืดตามความสูงของฟอร์มฝั่งขวา แล้วเกิดช่องว่าง 112px คั่นการ์ด */
  .col-left{grid-column:1;grid-row:2;display:flex;flex-direction:column}
  .bnk{order:1}
  .trst{order:2}
  .ord{order:3}
  .col-r{grid-column:2;grid-row:2;position:sticky;top:96px;margin:0}
  .foot{grid-column:1 / -1;grid-row:3}
  .total-p{font-size:28px}
}
'''
sub('\n</style>', RESPONSIVE + '</style>')
sub('<p class="tagline">mockup เทียบของเดิม ยังไม่ได้แก้หน้าจริง</p>',
    '<p class="tagline">หน้าตัวอย่าง ยังไม่ได้แก้หน้าสั่งซื้อจริง ปุ่มทุกปุ่มในหน้านี้ไม่ได้ส่งข้อมูลไปไหน</p>')
io.open(dst, 'w', encoding='utf-8').write(s)
print('wrote', dst, len(s), 'bytes')
