/* ป้าย "ใหม่" บนการ์ด — กติกาเดียวใช้ทั้งหน้าแรกและหน้าคลัง แก้ที่นี่ที่เดียว
   ใหม่ = ชุดที่เพิ่งเข้าคลัง ไล่ทีละรอบอัปโหลด (วันที่ `added`) จากใหม่สุด
   - หยุดเมื่อจะเกิน 10% ของคลัง ป้ายต้องหายาก ไม่งั้นติดทุกใบก็เท่ากับไม่ได้บอกอะไร
   - ไม่ตัดกลางรอบ ชุดที่ขึ้นวันเดียวกันต้องได้ป้ายเหมือนกัน (ยกเว้นรอบแรกใหญ่เกิน cap)
   - เกิน 60 วันไม่ติดป้าย ถ้าหยุดอัปชุดใหม่ ป้ายหายเอง ไม่ต้องมาไล่ลบทีหลัง */
window.ctNew = function (list) {
  const cap = Math.max(8, Math.round(list.length * 0.1)), cutoff = Date.now() - 60 * 864e5;
  const byDay = {};
  list.forEach(x => { if (x.added) (byDay[x.added] = byDay[x.added] || []).push(x); });
  const out = new Set();
  for (const day of Object.keys(byDay).sort().reverse()) {
    if (Date.parse(day) < cutoff) break;
    const batch = byDay[day].slice().sort((a, b) => b.no - a.no);
    if (out.size + batch.length > cap) {
      if (out.size) break;                       // รอบก่อนหน้าเต็มแล้ว พอแค่นี้
      batch.slice(0, cap).forEach(x => out.add(x.slug));   // รอบแรกใหญ่เกิน cap ตัดเอาใหม่สุด
      break;
    }
    batch.forEach(x => out.add(x.slug));
  }
  return out;
};
