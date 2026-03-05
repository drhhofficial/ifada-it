// ============================================================
//  ⚙️  إعدادات النظام — عدّل القيم دي بس
// ============================================================
const CONFIG = {
  SHEET_ID:   'YOUR_SHEET_ID_HERE',   // من رابط الشيت (بين /d/ و /edit)
  SHEET_NAME: 'Sheet1',               // اسم التاب في الشيت
  ADMIN_PASS: 'Tanta@IT2024',         // كلمة سر الأدمن — غيّرها!
  UNIT_AR:    'وحدة تكنولوجيا المعلومات',
  UNIT_EN:    'Information Technology Unit, Faculty of Science, Tanta University',
  FACULTY:    'كلية العلوم',
  UNIVERSITY: 'جامعة طنطا',
  IT_MANAGER: 'دكتور/ هشام محمد عطية هاشم',
  DEAN_NAME:  'أستاذ دكتور/ عبير عبد الحميد علم الدين',
  VALIDITY:   'صالحية الإفادة 6 أشهر من تاريخ الإصدار.',
};

// أسماء الحقول الثابتة — لا تعدّلها
const FIELD_KEYS = [
  'name', 'name_en', 'email', 'dept', 'faculty', 'rank',
  'personal_url', 'pub_count',
  'scopus_url', 'scopus_id', 'orcid', 'scholar',
  'researchgate', 'wos_url', 'wos_id'
];

// ============================================================
//  نقطة الدخول
// ============================================================
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || 'member';
  const tmpl = HtmlService.createTemplateFromFile(
    page === 'admin' ? 'admin' : 'member'
  );
  tmpl.config = JSON.stringify(CONFIG);
  return tmpl.evaluate()
    .setTitle(page === 'admin' ? 'Admin Panel — وحدة IT' : 'إفادة استكمال المتطلبات الإلكترونية')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
//  جلب headers الشيت (للربط)
// ============================================================
function getSheetHeaders(pass) {
  if (pass !== CONFIG.ADMIN_PASS) return { error: 'غير مصرح' };
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return { headers: headers.map(String) };
  } catch(e) {
    return { error: 'خطأ في الاتصال بالشيت: ' + e.message };
  }
}

// ============================================================
//  حفظ إعدادات ربط الأعمدة في PropertiesService
// ============================================================
function saveColumnMapping(pass, mapping) {
  if (pass !== CONFIG.ADMIN_PASS) return { error: 'غير مصرح' };
  // mapping = { name: 2, email: 3, ... }  (أرقام 1-based)
  PropertiesService.getScriptProperties().setProperty('COL_MAP', JSON.stringify(mapping));
  return { success: true };
}

function getColumnMapping(pass) {
  if (pass !== CONFIG.ADMIN_PASS) return { error: 'غير مصرح' };
  const raw = PropertiesService.getScriptProperties().getProperty('COL_MAP');
  return { mapping: raw ? JSON.parse(raw) : null };
}

// ============================================================
//  قراءة الشيت بعد الربط
// ============================================================
function _getMapping() {
  const raw = PropertiesService.getScriptProperties().getProperty('COL_MAP');
  return raw ? JSON.parse(raw) : null;
}

function _rowToMember(row, mapping, rowIndex) {
  const m = { rowIndex };
  FIELD_KEYS.forEach(k => {
    const col = mapping[k];
    m[k] = (col !== undefined && col !== null && col !== '')
      ? String(row[parseInt(col) - 1] || '').trim()
      : '';
  });
  // عمود الحالة
  const statusCol = mapping['status'];
  m.status = (statusCol !== undefined && statusCol !== null && statusCol !== '')
    ? String(row[parseInt(statusCol) - 1] || '').trim()
    : '';
  return m;
}

// ============================================================
//  جلب كل الأعضاء (للأدمن)
// ============================================================
function getAllMembers(pass) {
  if (pass !== CONFIG.ADMIN_PASS) return { error: 'غير مصرح' };
  const mapping = _getMapping();
  if (!mapping) return { error: 'لم يتم ربط الأعمدة بعد' };

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    const data  = sheet.getDataRange().getValues();
    const members = [];

    for (let i = 1; i < data.length; i++) {
      if (!data[i].some(c => c)) continue;
      const m = _rowToMember(data[i], mapping, i + 1);
      if (m.name || m.email) members.push(m);
    }
    return { members, total: members.length };
  } catch(e) {
    return { error: e.message };
  }
}

// ============================================================
//  جلب عضو بالإيميل (للعضو)
// ============================================================
function getMemberByEmail(email) {
  const mapping = _getMapping();
  if (!mapping) return { error: 'النظام غير مُهيأ بعد' };

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    const data  = sheet.getDataRange().getValues();
    const emailLower = email.trim().toLowerCase();

    for (let i = 1; i < data.length; i++) {
      const m = _rowToMember(data[i], mapping, i + 1);
      if (m.email.toLowerCase() === emailLower) {
        return {
          found:    true,
          approved: m.status === 'معتمد',
          member:   m,
          config:   CONFIG,
        };
      }
    }
    return { found: false };
  } catch(e) {
    return { error: e.message };
  }
}

// ============================================================
//  تغيير حالة عضو
// ============================================================
function setMemberStatus(pass, rowIndex, newStatus) {
  if (pass !== CONFIG.ADMIN_PASS) return { error: 'غير مصرح' };
  const mapping = _getMapping();
  if (!mapping || !mapping.status) return { error: 'عمود الحالة غير محدد' };

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    sheet.getRange(rowIndex, parseInt(mapping.status)).setValue(newStatus);
    SpreadsheetApp.flush();
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// ============================================================
//  اعتماد الكل دفعة واحدة
// ============================================================
function approveAll(pass) {
  if (pass !== CONFIG.ADMIN_PASS) return { error: 'غير مصرح' };
  const mapping = _getMapping();
  if (!mapping || !mapping.status) return { error: 'عمود الحالة غير محدد' };

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    const data  = sheet.getDataRange().getValues();
    let count   = 0;
    const statusCol = parseInt(mapping.status);

    for (let i = 1; i < data.length; i++) {
      if (data[i].some(c => c)) {
        sheet.getRange(i + 1, statusCol).setValue('معتمد');
        count++;
      }
    }
    SpreadsheetApp.flush();
    return { success: true, count };
  } catch(e) {
    return { error: e.message };
  }
}

// ============================================================
//  تحقق كلمة سر الأدمن
// ============================================================
function checkAdminPass(pass) {
  return pass === CONFIG.ADMIN_PASS;
}

// ============================================================
//  إحصائيات سريعة
// ============================================================
function getStats(pass) {
  if (pass !== CONFIG.ADMIN_PASS) return { error: 'غير مصرح' };
  const result = getAllMembers(pass);
  if (result.error) return result;
  const members = result.members;
  return {
    total:    members.length,
    approved: members.filter(m => m.status === 'معتمد').length,
    pending:  members.filter(m => m.status !== 'معتمد').length,
  };
}
