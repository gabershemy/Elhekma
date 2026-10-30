/**
 * Elhekma Healthy Care - Main Logic
 * تحكم كامل في عرض البيانات، الربط مع Google Sheets، البحث الفوري والفلترة
 */

let allProviders = [];
let activeCategory = 'all';
let activeSpecialty = 'all';
let searchQuery = '';
let isGoogleSheetConnected = false;

// دالة التهيئة الأولية - قراءة البيانات من Google Sheets فقط
async function initializeData() {
  allProviders = [];

  // رسم الواجهة المبدئية
  renderCategoriesMockup();
  renderFilterTabs();
  renderPaperSummary();
  setupWhatsAppButton();

  // إظهار شارة جاري التحميل الأنيقة
  const container = document.getElementById('providersListContainer');
  if (container) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 50px 20px;">
        <i class="fa-solid fa-spinner fa-spin text-success fa-2x mb-3"></i>
        <h5 style="font-weight: 800; color: #0f172a;">جاري تحميل أحدث البيانات من Google Sheets...</h5>
        <p class="text-muted" style="font-size: 0.88rem;">يتم الآن قراءة قائمة الأطباء والمراكز ونسب الخصم الحية من جدول البيانات</p>
      </div>
    `;
  }

  // جلب البيانات حصرياً من Google Sheets
  await fetchLiveGoogleSheetData();
}

// جلب وتحليل البيانات المباشرة من Google Sheets
async function fetchLiveGoogleSheetData() {
  const syncBadge = document.getElementById('sheetSyncBadge');
  if (syncBadge) {
    syncBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> جاري تحديث البيانات من Google Sheets...';
    syncBadge.className = 'sheet-sync-status syncing';
    syncBadge.style.display = 'inline-flex';
  }

  try {
    const response = await fetch(GOOGLE_SHEETS_CONFIG.getCsvUrl());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows && rows.length > 1) {
      const headers = rows[0].map(h => h.trim().toLowerCase());
      
      // مطابقة أماكن الأعمدة
      const nameIdx = headers.findIndex(h => h.includes('اسم') || h.includes('name'));
      const catIdx = headers.findIndex(h => h.includes('قسم') || h.includes('category'));
      const discIdx = headers.findIndex(h => h.includes('خصم') || h.includes('discount'));
      const typeIdx = headers.findIndex(h => h.includes('تخصص') || h.includes('نوع') || h.includes('type'));
      const locIdx = headers.findIndex(h => h.includes('موقع') || h.includes('عنوان') || h.includes('location'));
      const phoneIdx = headers.findIndex(h => h.includes('هاتف') || h.includes('تليفون') || h.includes('phone'));
      const waIdx = headers.findIndex(h => h.includes('واتس') || h.includes('whatsapp'));
      const detailsIdx = headers.findIndex(h => h.includes('تفاصيل') || h.includes('details'));
      const notesIdx = headers.findIndex(h => h.includes('ملاحظ') || h.includes('notes'));

      const parsedItems = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = nameIdx !== -1 ? row[nameIdx] : row[0];
        if (!name || name.trim() === '') continue;

        // التحقق إذا كان السطر مخصص لضبط رقم واتساب الشركة العام
        const cleanName = name.trim().toLowerCase();
        if (cleanName.includes('واتساب') || cleanName.includes('whatsapp') || cleanName.includes('رقم الشركة')) {
          const customWa = (waIdx !== -1 && row[waIdx]) ? row[waIdx] : (phoneIdx !== -1 ? row[phoneIdx] : '');
          if (customWa && customWa.trim()) {
            companyInfo.whatsappNumber = customWa.trim();
            setupWhatsAppButton();
          }
          continue; // لا نظهره ككارت طبيب
        }

        const rawCat = catIdx !== -1 ? row[catIdx] : (row[1] || 'doctors');
        const disc = discIdx !== -1 ? row[discIdx] : (row[2] || '20%');
        const type = typeIdx !== -1 ? row[typeIdx] : (row[3] || 'جهة معتمدة');
        const loc = locIdx !== -1 ? row[locIdx] : (row[4] || 'دمنهور / البحيرة');
        const phone = phoneIdx !== -1 ? row[phoneIdx] : (row[5] || companyInfo.phone);
        const itemWa = (waIdx !== -1 && row[waIdx]) ? row[waIdx].trim() : null;
        const details = detailsIdx !== -1 ? row[detailsIdx] : (row[6] || '');
        const notes = notesIdx !== -1 ? row[notesIdx] : (row[7] || '');

        parsedItems.push({
          id: `sheet-${i}`,
          name: name.trim(),
          category: normalizeCategory(rawCat),
          type: type.trim(),
          discount: disc.trim(),
          details: details.trim() || `خصم ${disc} لعملاء بطاقة الحكمة للرعاية الصحية.`,
          notes: notes.trim(),
          location: loc.trim() || 'دمنهور / البحيرة',
          phone: phone.trim() || companyInfo.phone,
          whatsapp: itemWa,
          isFromGoogleSheet: true
        });
      }

      if (parsedItems.length > 0) {
        // قراءة وتعيين البيانات فقط وحصرياً من Google Sheets
        allProviders = parsedItems;
        isGoogleSheetConnected = true;

        updateCategoryCounts();
        renderCategoriesMockup();
        renderFilterTabs();
        updateSpecialtiesList();
        renderProviders();

        if (syncBadge) {
          syncBadge.innerHTML = '<i class="fa-solid fa-circle-check text-success me-1"></i> يتم العرض من Google Sheets مباشرة';
          syncBadge.className = 'sheet-sync-status connected';
        }
      }
    }
  } catch (error) {
    console.warn("Could not sync with Google Sheets:", error);
    if (syncBadge) {
      syncBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-danger me-1"></i> تعذر الاتصال بـ Google Sheets';
      syncBadge.className = 'sheet-sync-status fallback';
    }
  }
}

// دالة تحليل ملف CSV والتعامل مع الفواصل وعلامات التنصيص
function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(currentVal.trim());
      currentVal = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      row.push(currentVal.trim());
      currentVal = '';
      if (row.length > 0 && row.some(cell => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentVal += c;
    }
  }
  if (currentVal.length > 0 || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell.length > 0)) {
      lines.push(row);
    }
  }
  return lines;
}

// مطابقة أسماء الأقسام العربية والإنجليزية
function normalizeCategory(cat) {
  if (!cat) return 'doctors';
  const c = cat.toLowerCase().trim();
  if (c.includes('مستشف') || c.includes('hospital')) return 'hospitals';
  if (c.includes('معمل') || c.includes('تحاليل') || c.includes('lab')) return 'labs';
  if (c.includes('صيدل') || c.includes('pharm')) return 'pharmacies';
  if (c.includes('أشعة') || c.includes('اشعه') || c.includes('سونار') || c.includes('radio')) return 'radiology';
  if (c.includes('أسنان') || c.includes('اسنان') || c.includes('dent')) return 'dental';
  if (c.includes('علاج') || c.includes('طبيعي') || c.includes('physio')) return 'physiotherapy';
  if (c.includes('طبيب') || c.includes('أطباء') || c.includes('اطباء') || c.includes('عياد') || c.includes('doctor')) return 'doctors';
  return 'doctors';
}

// حساب عدد الجهات لكل قسم
function updateCategoryCounts() {
  medicalCategories.forEach(cat => {
    if (cat.id === 'all') {
      cat.count = allProviders.length;
    } else {
      cat.count = allProviders.filter(item => item.category === cat.id).length;
    }
  });
}

// رسم بطاقات الأقسام العلوية المطابقة تماماً لموك آب الصورة
function renderCategoriesMockup() {
  const container = document.getElementById('mockupCategoriesContainer');
  if (!container) return;

  const displayCats = medicalCategories.filter(c => c.id !== 'all');

  container.innerHTML = displayCats.map(cat => `
    <div class="mockup-category-card ${activeCategory === cat.id ? 'active' : ''}" 
         onclick="selectCategory('${cat.id}', true)">
      
      <div class="card-icon-box">
        <i class="${cat.icon}"></i>
      </div>

      <div class="card-details">
        <div class="card-title-row">
          <span class="card-title-arabic">${cat.title}</span>
          <span class="card-title-en">${cat.titleEn}</span>
        </div>
        <p class="card-desc">${cat.desc}</p>
        <div class="card-arrows-indicator">
          <span>عرض التفاصيل والخصومات</span>
          <i class="fa-solid fa-angles-left"></i>
        </div>
      </div>
      
    </div>
  `).join('');
}

// رسم أزرار الفلترة السريعة (Tabs)
function renderFilterTabs() {
  const container = document.getElementById('filterTabsContainer');
  if (!container) return;

  container.innerHTML = medicalCategories.map(cat => `
    <button class="tab-btn ${activeCategory === cat.id ? 'active' : ''}" 
            onclick="selectCategory('${cat.id}')">
      <i class="${cat.icon}"></i>
      <span>${cat.title}</span>
      <span class="badge bg-light text-dark ms-1" style="font-size: 0.72rem; border-radius: 10px;">${cat.count}</span>
    </button>
  `).join('');
}

// رسم ملخص بنود الورقة الرسمية
function renderPaperSummary() {
  const container = document.getElementById('paperSummaryGrid');
  if (!container) return;

  container.innerHTML = generalOfferings.map(item => `
    <div class="paper-item-card">
      <span class="paper-badge ${getBadgeColor(item.discount)}">
        <i class="fa-solid fa-tag me-1"></i> ${item.discountLabel}
      </span>
      <h4 style="font-size: 0.96rem; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
        <i class="${item.icon} text-success me-1"></i> ${item.title}
      </h4>
      <p style="font-size: 0.82rem; color: #475569; margin-bottom: 0;">${item.details}</p>
    </div>
  `).join('');
}

function getBadgeColor(discount) {
  if (discount.includes('30%')) return 'green';
  if (discount.includes('25%')) return 'teal';
  return 'blue';
}

// دليل التخصصات الطبية الشامل مع الأيقونات والألوان والكلمات الدلالية
const MEDICAL_SPECIALTIES = [
  {
    key: "internal",
    title: "أمراض الباطنة العامة والجهاز الهضمي والكبد",
    shortTitle: "باطنة",
    icon: "fa-solid fa-stethoscope",
    color: "#0d9488",
    bg: "#ecfdf5",
    keywords: ["باطن", "باطنة", "باطنه", "جهاز هضمي", "كبد"]
  },
  {
    key: "cardio",
    title: "أمراض القلب والأوعية الدموية والقسطرة",
    shortTitle: "قلب",
    icon: "fa-solid fa-heart-pulse",
    color: "#e11d48",
    bg: "#fff1f2",
    keywords: ["قلب", "قسطرة", "رسم قلب", "ايكو"]
  },
  {
    key: "vascular",
    title: "جراحة الأوعية الدموية والقدم السكري والدوالي",
    shortTitle: "أوعية دموية",
    icon: "fa-solid fa-heart-circle-bolt",
    color: "#dc2626",
    bg: "#fef2f2",
    keywords: ["اوعيه", "أوعية", "اوعية", "أوعيه", "دوالي", "قدم سكري"]
  },
  {
    key: "chest",
    title: "الأمراض الصدرية والحساسية والجهاز التنفسي",
    shortTitle: "صدرية",
    icon: "fa-solid fa-lungs",
    color: "#0284c7",
    bg: "#f0f9ff",
    keywords: ["صدر", "تنفسي", "حساسية الصدر", "رئوي"]
  },
  {
    key: "obgyn",
    title: "أمراض النساء والتوليد وعلاج العقم والحقن المجهري",
    shortTitle: "نساء وتوليد",
    icon: "fa-solid fa-person-pregnant",
    color: "#be185d",
    bg: "#fdf2f8",
    keywords: ["نسا", "نساء", "توليد", "حمل", "سونار نسا"]
  },
  {
    key: "pedia",
    title: "طب الأطفال وحديثي الولادة والمبتسرين",
    shortTitle: "أطفال",
    icon: "fa-solid fa-baby",
    color: "#db2777",
    bg: "#fdf2f8",
    keywords: ["اطفال", "أطفال", "رضع", "مبتسرين", "نمو"]
  },
  {
    key: "ortho",
    title: "جراحة العظام والمفاصل والعمود الفقري والكسور",
    shortTitle: "عظام",
    icon: "fa-solid fa-bone",
    color: "#ea580c",
    bg: "#fff7ed",
    keywords: ["عظام", "مفاصل", "كسور", "عمود فقري", "غضروف"]
  },
  {
    key: "uro",
    title: "جراحة الكلى والمسالك البولية والتناسلية والعقم",
    shortTitle: "مسالك بولية",
    icon: "fa-solid fa-droplet",
    color: "#0891b2",
    bg: "#ecfeff",
    keywords: ["مسالك", "بولية", "كلى", "تناسلية", "تناسليه", "عقم", "بروستاتا"]
  },
  {
    key: "eyes",
    title: "طب وجراحة العيون والرمد والليزك",
    shortTitle: "رمد وعيون",
    icon: "fa-solid fa-eye",
    color: "#2563eb",
    bg: "#eff6ff",
    keywords: ["رمد", "عيون", "عين", "ليزك", "شبكية", "مياه بيضاء"]
  },
  {
    key: "ent",
    title: "طب وجراحة الأنف والأذن والحنجرة",
    shortTitle: "أنف وأذن",
    icon: "fa-solid fa-head-side-cough",
    color: "#4f46e5",
    bg: "#eef2ff",
    keywords: ["انف", "أنف", "اذن", "أذن", "حنجر", "حنجرة", "سمع"]
  },
  {
    key: "derma",
    title: "أمراض الجلدية والتناسلية والتجميل والليزر",
    shortTitle: "جلدية وتجميل",
    icon: "fa-solid fa-wand-magic-sparkles",
    color: "#d97706",
    bg: "#fffbeb",
    keywords: ["جلد", "جلدية", "جلديه", "تجميل", "ليزر"]
  },
  {
    key: "endo",
    title: "أمراض الغدد الصماء وعلاج السكر ومقاومة الأنسولين",
    shortTitle: "غدد وسكر",
    icon: "fa-solid fa-dna",
    color: "#7c3aed",
    bg: "#f5f3ff",
    keywords: ["غدد", "سكر", "غدة", "أنسولين", "سكر وغدد"]
  },
  {
    key: "surgery",
    title: "الجراحة العامة وجراحة الأورام والمناظير",
    shortTitle: "جراحة عامة",
    icon: "fa-solid fa-syringe",
    color: "#b91c1c",
    bg: "#fef2f2",
    keywords: ["جراح", "جراحة", "مناظير", "اورام", "أورام"]
  },
  {
    key: "neuro",
    title: "طب وجراحة المخ والأعصاب",
    shortTitle: "مخ وأعصاب",
    icon: "fa-solid fa-brain",
    color: "#7e22ce",
    bg: "#faf5ff",
    keywords: ["مخ", "اعصاب", "أعصاب", "جلطات", "صرع"]
  },
  {
    key: "psych",
    title: "الطب النفسي وعلاج الإدمان والصحة النفسية",
    shortTitle: "طب نفسي",
    icon: "fa-solid fa-head-side-virus",
    color: "#9333ea",
    bg: "#faf5ff",
    keywords: ["نفسي", "نفسية", "نفسيه", "إدمان", "ادمان"]
  },
  {
    key: "rheum",
    title: "أمراض الروماتيزم والمناعة والمفاصل",
    shortTitle: "روماتيزم ومناعة",
    icon: "fa-solid fa-shield-virus",
    color: "#9f1239",
    bg: "#fff1f2",
    keywords: ["روماتيزم", "مناعة", "روماتويد"]
  },
  {
    key: "dental",
    title: "طب وجراحة وتجميل وتركيبات الأسنان",
    shortTitle: "طب الأسنان",
    icon: "fa-solid fa-tooth",
    color: "#059669",
    bg: "#ecfdf5",
    keywords: ["اسنان", "أسنان", "تركيبات", "تقويم", "زراعة أسنان"]
  },
  {
    key: "physio",
    title: "العلاج الطبيعي والتأهيل الحركي وإصابات الملاعب",
    shortTitle: "علاج طبيعي",
    icon: "fa-solid fa-person-walking",
    color: "#16a34a",
    bg: "#f0fdf4",
    keywords: ["علاج طبيعي", "تأهيل", "جلسات", "حركي"]
  },
  {
    key: "general_doc",
    title: "عيادات واستشارات تخصصية ونخبة الأطباء",
    shortTitle: "استشارات تخصصية",
    icon: "fa-solid fa-user-doctor",
    color: "#0f766e",
    bg: "#f0fdfa",
    keywords: ["استشارات", "تخصصية", "أطباء واستشاريين", "عيادة", "عام"]
  }
];

// تحديد التخصص الطبي الأنسب لأي جهة أو طبيب
function getProviderSpecialtyInfo(item) {
  // إذا كانت الجهة ليست في قسم الأطباء (مستشفيات، معامل، صيدليات...)
  if (item.category && item.category !== 'doctors') {
    const cat = medicalCategories.find(c => c.id === item.category);
    return {
      key: item.category,
      title: cat ? cat.title : (item.type || 'خدمات طبية معتمدة'),
      shortTitle: cat ? cat.title : (item.type || 'خدمات طبية'),
      icon: cat ? cat.icon : 'fa-solid fa-hospital',
      color: '#0d9488',
      bg: '#ecfdf5',
      hint: cat ? cat.desc : 'مراكز وجهات طبية معتمدة لحاملي بطاقة الحكمة'
    };
  }

  // دمج النصوص للبحث بالكلمات الدلالية
  const text = `${item.type || ''} ${item.name || ''} ${item.details || ''}`.toLowerCase();

  for (const spec of MEDICAL_SPECIALTIES) {
    if (spec.key === 'general_doc') continue;
    for (const kw of spec.keywords) {
      if (text.includes(kw)) {
        return spec;
      }
    }
  }

  // إذا وجد تخصص مخصص في الشيت لم يشمله الفهرس
  if (item.type && item.type.trim() && !item.type.includes('جهة معتمدة') && !item.type.includes('استشارات تخصصية')) {
    return {
      key: item.type.trim(),
      title: item.type.trim(),
      shortTitle: item.type.trim(),
      icon: 'fa-solid fa-user-doctor',
      color: '#0f766e',
      bg: '#f0fdfa',
      hint: 'عيادات واستشارات طبية معتمدة بخصومات حصرية'
    };
  }

  return MEDICAL_SPECIALTIES.find(s => s.key === 'general_doc');
}

// تحديث قائمة وأزرار التخصصات الطبية ديناميكياً
function updateSpecialtiesList() {
  const chipsContainer = document.getElementById('specialtyChipsContainer');
  const select = document.getElementById('specialtySelect');
  const clearSpecBtn = document.getElementById('clearSpecialtyBtn');

  // جلب الجهات التابعة للقسم الحالي
  const relevantProviders = (activeCategory === 'all')
    ? allProviders
    : allProviders.filter(p => p.category === activeCategory);

  // احتساب عدد الأطباء / الجهات لكل تخصص
  const specialtyCounts = {};
  const presentSpecialties = new Map();

  relevantProviders.forEach(p => {
    const spec = getProviderSpecialtyInfo(p);
    specialtyCounts[spec.key] = (specialtyCounts[spec.key] || 0) + 1;
    if (!presentSpecialties.has(spec.key)) {
      presentSpecialties.set(spec.key, spec);
    }
  });

  // 1. رسم أزرار التخصصات الأفقية (Chips)
  if (chipsContainer) {
    let chipsHtml = `
      <button class="specialty-chip ${activeSpecialty === 'all' ? 'active' : ''}" 
              onclick="selectSpecialty('all')">
        <i class="fa-solid fa-border-all"></i>
        <span>كل التخصصات</span>
        <span class="chip-count">${relevantProviders.length}</span>
      </button>
    `;

    presentSpecialties.forEach((spec, key) => {
      const count = specialtyCounts[key] || 0;
      chipsHtml += `
        <button class="specialty-chip ${activeSpecialty === key ? 'active' : ''}" 
                onclick="selectSpecialty('${key}')"
                style="${activeSpecialty === key ? `background: ${spec.color}; border-color: ${spec.color};` : ''}">
          <i class="${spec.icon}" style="${activeSpecialty !== key ? `color: ${spec.color};` : ''}"></i>
          <span>${spec.shortTitle || spec.title}</span>
          <span class="chip-count">${count}</span>
        </button>
      `;
    });

    chipsContainer.innerHTML = chipsHtml;
  }

  // 2. تحديث القائمة المنسدلة (Dropdown)
  if (select) {
    let selectHtml = `<option value="all">🩺 كل التخصصات الطبية (${relevantProviders.length} متوفر)</option>`;
    presentSpecialties.forEach((spec, key) => {
      const count = specialtyCounts[key] || 0;
      const sel = (activeSpecialty === key) ? 'selected' : '';
      selectHtml += `<option value="${key}" ${sel}>${spec.title} (${count})</option>`;
    });

    select.innerHTML = selectHtml;
    select.value = activeSpecialty;
  }

  if (clearSpecBtn) {
    clearSpecBtn.style.display = (activeSpecialty !== 'all') ? 'flex' : 'none';
  }
}

// دالة اختيار تخصص معين
function selectSpecialty(specKey) {
  activeSpecialty = specKey;
  updateSpecialtiesList();
  renderProviders();

  // تمرير الشاشة بلطف لقائمة الأطباء
  const target = document.getElementById('providersSection');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

// رسم قائمة الأطباء والمراكز مقسمة تحت كل تخصص بالأيقونة المميزة
function renderProviders() {
  const container = document.getElementById('providersListContainer');
  const countBadge = document.getElementById('providersCountBadge');
  const clearSpecBtn = document.getElementById('clearSpecialtyBtn');
  if (!container) return;

  if (clearSpecBtn) {
    clearSpecBtn.style.display = (activeSpecialty !== 'all') ? 'flex' : 'none';
  }

  // تصفية العناصر حسب القسم، التخصص، والبحث
  let filtered = allProviders.filter(item => {
    const matchCategory = (activeCategory === 'all' || item.category === activeCategory);
    const spec = getProviderSpecialtyInfo(item);
    const matchSpecialty = (activeSpecialty === 'all' || spec.key === activeSpecialty);

    if (!searchQuery) return matchCategory && matchSpecialty;

    const q = searchQuery.toLowerCase().trim();
    const matchName = item.name.toLowerCase().includes(q);
    const matchDetails = item.details.toLowerCase().includes(q);
    const matchNotes = item.notes ? item.notes.toLowerCase().includes(q) : false;
    const matchLoc = item.location ? item.location.toLowerCase().includes(q) : false;
    const matchDisc = item.discount.toLowerCase().includes(q);
    const matchType = item.type ? item.type.toLowerCase().includes(q) : false;
    const matchSpecTitle = spec.title.toLowerCase().includes(q);

    return matchCategory && matchSpecialty && (matchName || matchDetails || matchNotes || matchLoc || matchDisc || matchType || matchSpecTitle);
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} جهة متوفرة`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-magnifying-glass fa-2x mb-2 text-muted"></i>
        <h4 style="font-weight: 800; margin-bottom: 6px;">لا توجد نتائج مطابقة</h4>
        <p>جرب البحث بكلمة أخرى أو اختيار تخصص آخر</p>
        <button class="btn btn-outline-success mt-2" onclick="resetFilters()">عرض جميع الأطباء والتخصصات</button>
      </div>
    `;
    return;
  }

  // تجميع الأطباء / الجهات حسب التخصص
  const groupsMap = new Map();
  filtered.forEach(item => {
    const spec = getProviderSpecialtyInfo(item);
    if (!groupsMap.has(spec.key)) {
      groupsMap.set(spec.key, {
        spec: spec,
        items: []
      });
    }
    groupsMap.get(spec.key).items.push(item);
  });

  // بناء الكود مع العنوان والأيقونة الجميلة لكل تخصص
  let outputHtml = '';

  groupsMap.forEach((group) => {
    const spec = group.spec;
    const itemsCount = group.items.length;
    const countText = itemsCount === 1 ? 'طبيب / جهة واحدة' : `${itemsCount} أطباء / جهات معتمدة`;

    outputHtml += `
      <section class="specialty-block" id="spec-group-${spec.key}">
        
        <!-- عنوان ورأس التخصص مع الأيقونة الجميلة -->
        <div class="specialty-section-header" style="border-right-color: ${spec.color};">
          <div class="specialty-icon-circle" style="background: ${spec.bg}; color: ${spec.color}; border: 1.5px solid ${spec.color}40;">
            <i class="${spec.icon}"></i>
          </div>
          <div class="specialty-header-content">
            <div class="specialty-title-row">
              <h3 class="specialty-title-text" style="color: ${spec.color};">
                ${spec.title}
              </h3>
              <span class="specialty-count-badge" style="background: ${spec.color}15; color: ${spec.color}; border: 1px solid ${spec.color}35;">
                <i class="fa-solid fa-user-doctor me-1"></i> ${countText}
              </span>
            </div>
            <div class="specialty-hint">
              ${spec.hint || 'نخبة الأطباء والاستشاريين المعتمدين لحاملي بطاقة الحكمة'}
            </div>
          </div>
        </div>

        <!-- شبكة كروت الأطباء التابعين لهذا التخصص -->
        <div class="providers-grid">
          ${group.items.map(item => renderProviderCardHtml(item, spec)).join('')}
        </div>

      </section>
    `;
  });

  container.innerHTML = outputHtml;
}

// دالة بناء كارت الطبيب أو المركز الفردي
function renderProviderCardHtml(item, spec) {
  const catObj = medicalCategories.find(c => c.id === item.category) || {};
  const isHighDiscount = item.discount.includes('30%') || item.discount.includes('25%');

  return `
    <div class="provider-card">
      <div>
        <div class="provider-card-top">
          <div class="provider-info">
            <span class="provider-category-tag" style="color: ${spec.color};">
              <i class="${spec.icon}"></i>
              ${spec.shortTitle || catObj.title || 'طبيب معتمد'}
            </span>
            <h3>${item.name}</h3>
            <div style="font-size: 0.82rem; font-weight: 700; color: #0284c7;">
              ${item.type || spec.title}
            </div>
          </div>
          <div class="discount-ribbon ${isHighDiscount ? 'high' : ''}">
            <i class="fa-solid fa-percent"></i>
            <span>خصم ${item.discount}</span>
          </div>
        </div>

        <div class="provider-body">
          <p style="margin-bottom: 6px;">${item.details}</p>
          ${item.notes ? `
            <div class="provider-note">
              <i class="fa-solid fa-clock text-success"></i>
              <span>${item.notes}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div>
        <div class="provider-meta">
          <span><i class="fa-solid fa-location-dot me-1 text-danger"></i> ${item.location || 'دمنهور / البحيرة'}</span>
          ${item.phone ? `<span><i class="fa-solid fa-phone me-1 text-primary"></i> ${item.phone}</span>` : '<span><i class="fa-solid fa-shield-halved me-1 text-success"></i> تعاقد معتمد</span>'}
        </div>

        <div class="provider-actions">
          <a href="tel:${item.phone || companyInfo.phone}" class="btn-card-action btn-card-call" title="حجز أو اتصال">
            <i class="fa-solid fa-phone"></i>
            <span>اتصال للحجز</span>
          </a>
          <a href="https://wa.me/${formatWhatsAppNumber(item.whatsapp || companyInfo.whatsappNumber)}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن كارت الخصم والتعاقد مع: ' + item.name)}" 
             target="_blank" 
             class="btn-card-action btn-card-whatsapp">
            <i class="fa-brands fa-whatsapp"></i>
            <span>استفسار واتساب</span>
          </a>
        </div>
      </div>
    </div>
  `;
}


// اختيار القسم
function selectCategory(catId, scrollToList = false) {
  activeCategory = catId;
  activeSpecialty = 'all'; // إعادة ضبط التخصص ليتناسب مع القسم الجديد
  renderCategoriesMockup();
  renderFilterTabs();
  updateSpecialtiesList();
  renderProviders();

  if (scrollToList) {
    const listSection = document.getElementById('providersSection');
    if (listSection) {
      listSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// إعادة تعيين الفلاتر
function resetFilters() {
  activeCategory = 'all';
  activeSpecialty = 'all';
  searchQuery = '';
  const searchInput = document.getElementById('mainSearchInput');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.style.display = 'none';

  renderCategoriesMockup();
  renderFilterTabs();
  updateSpecialtiesList();
  renderProviders();
}

// ربط البحث الفوري والتحكم
document.addEventListener('DOMContentLoaded', () => {
  initializeData();

  const searchInput = document.getElementById('mainSearchInput');
  const clearBtn = document.getElementById('clearSearchBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearBtn) {
        clearBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
      }
      renderProviders();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearBtn.style.display = 'none';
      renderProviders();
    });
  }

  // فلتر التخصص الطبي (القائمة المنسدلة)
  const specSelect = document.getElementById('specialtySelect');
  if (specSelect) {
    specSelect.addEventListener('change', (e) => {
      selectSpecialty(e.target.value);
    });
  }

  const clearSpecBtn = document.getElementById('clearSpecialtyBtn');
  if (clearSpecBtn) {
    clearSpecBtn.addEventListener('click', () => {
      selectSpecialty('all');
    });
  }

  // زر تحديث البيانات اليدوي
  const refreshBtn = document.getElementById('manualSyncBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.querySelector('i').classList.add('fa-spin');
      await fetchLiveGoogleSheetData();
      setTimeout(() => {
        refreshBtn.querySelector('i').classList.remove('fa-spin');
      }, 500);
    });
  }
});

// إعداد زر الواتساب السفلي
function setupWhatsAppButton() {
  const btn = document.getElementById('floatingWhatsAppBtn');
  if (btn) {
    const url = `https://wa.me/${formatWhatsAppNumber(companyInfo.whatsappNumber)}?text=${encodeURIComponent(companyInfo.whatsappMessage)}`;
    btn.setAttribute('href', url);
  }
}

function formatWhatsAppNumber(phone) {
  if (!phone) return '201553324646';
  let clean = phone.toString().replace(/[^0-9]/g, '');
  if (clean.startsWith('01') && clean.length === 11) {
    clean = '20' + clean.substring(1);
  }
  return clean;
}
