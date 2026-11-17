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
  /* ฟุตเตอร์ชุดเดียวกับหน้าจริง: แบรนด์ซ้าย ทางติดต่อขวา */
  .footer{padding:52px 0 0}
  .footer-inner{display:grid;grid-template-columns:1.6fr 1fr;align-items:start;text-align:left;gap:40px;
    padding:0 48px 36px;max-width:1060px;margin:0 auto}
  .footer-col--brand{align-items:flex-start}
  .footer-col-link{justify-content:flex-start;font-size:14px}
  .footer-bottom{padding:16px 48px 32px;font-size:12px}
  .footer-tagline{font-size:14px}
  .footer-guarantee{font-size:13px}
}
@media (min-width:1024px){
  /* สองคอลัมน์ชุดเดียวกับ order.html จริง: ซ้าย 1fr ขวา 1.15fr เบรกที่ 1024
     การ์ดบัญชีตรึงไว้ (top:110px เท่าหน้าจริง) ไหลตามลงมาตอนกรอกฟอร์ม
     สรุปรายการอยู่บนสุดของคอลัมน์ซ้าย อ่านจบแล้วปล่อยให้เลื่อนผ่านไปได้ */
  .wrap{
    max-width:1060px;display:grid;gap:16px 28px;align-items:start;
    grid-template-columns:1fr 1.15fr;padding:0 40px 70px;
    align-content:start;grid-auto-rows:min-content;
  }
  #ct-top{grid-column:1 / -1;grid-row:1}
  /* align-self:stretch ทำให้คอลัมน์ซ้ายสูงเท่าฟอร์ม ไม่งั้น sticky ไม่มีระยะให้ไหล */
  .col-left{grid-column:1;grid-row:2;display:flex;flex-direction:column;align-self:stretch}
  .ord{order:1}
  .bnk{order:2;position:sticky;top:110px}
  .trst{order:3}
  .col-r{grid-column:2;grid-row:2;margin:0}
  .total-p{font-size:28px}
  .footer-inner{grid-template-columns:2fr 1.3fr;gap:56px;padding:0 80px 52px}
  .footer-bottom{padding:20px 80px 36px}
  .footer-mark{width:140px;height:40px}
}
'''
sub('\n</style>', RESPONSIVE + '</style>')
sub('<p class="tagline">mockup เทียบของเดิม ยังไม่ได้แก้หน้าจริง</p>',
    '<p class="tagline">หน้าตัวอย่าง ยังไม่ได้แก้หน้าสั่งซื้อจริง ปุ่มทุกปุ่มในหน้านี้ไม่ได้ส่งข้อมูลไปไหน</p>')
io.open(dst, 'w', encoding='utf-8').write(s)
print('wrote', dst, len(s), 'bytes')
