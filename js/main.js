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

// تحديث قائمة التخصصات الطبية ديناميكياً
function updateSpecialtiesList() {
  const select = document.getElementById('specialtySelect');
  if (!select) return;

  // جلب التخصصات المناسبة حسب القسم المختار حالياً
  const relevantProviders = (activeCategory === 'all')
    ? allProviders
    : allProviders.filter(p => p.category === activeCategory);

  const specialtiesSet = new Set();
  relevantProviders.forEach(p => {
    if (p.type && p.type.trim() && p.type.trim() !== 'جهة معتمدة' && p.type.trim() !== 'جهة طبية معتمدة') {
      specialtiesSet.add(p.type.trim());
    }
  });

  const sorted = Array.from(specialtiesSet).sort((a, b) => a.localeCompare(b, 'ar'));

  let html = `<option value="all">🩺 كل التخصصات الطبية (${relevantProviders.length} متوفر)</option>`;
  sorted.forEach(spec => {
    const count = relevantProviders.filter(p => p.type && (p.type.trim() === spec || p.type.includes(spec))).length;
    const sel = (activeSpecialty === spec) ? 'selected' : '';
    html += `<option value="${spec}" ${sel}>${spec} (${count})</option>`;
  });

  select.innerHTML = html;
  
  if (activeSpecialty !== 'all' && !specialtiesSet.has(activeSpecialty)) {
    activeSpecialty = 'all';
    select.value = 'all';
  } else {
    select.value = activeSpecialty;
  }

  const clearSpecBtn = document.getElementById('clearSpecialtyBtn');
  if (clearSpecBtn) {
    clearSpecBtn.style.display = (activeSpecialty !== 'all') ? 'flex' : 'none';
  }
}

// رسم قائمة الجهات والخصومات
function renderProviders() {
  const container = document.getElementById('providersListContainer');
  const countBadge = document.getElementById('providersCountBadge');
  const clearSpecBtn = document.getElementById('clearSpecialtyBtn');
  if (!container) return;

  if (clearSpecBtn) {
    clearSpecBtn.style.display = (activeSpecialty !== 'all') ? 'flex' : 'none';
  }

  let filtered = allProviders.filter(item => {
    const matchCategory = (activeCategory === 'all' || item.category === activeCategory);
    
    // فلتر التخصص الطبي
    const matchSpecialty = (activeSpecialty === 'all') 
      || (item.type && item.type.trim() === activeSpecialty)
      || (item.type && item.type.toLowerCase().includes(activeSpecialty.toLowerCase()))
      || (item.details && item.details.toLowerCase().includes(activeSpecialty.toLowerCase()));

    if (!searchQuery) return matchCategory && matchSpecialty;

    const q = searchQuery.toLowerCase().trim();
    const matchName = item.name.toLowerCase().includes(q);
    const matchDetails = item.details.toLowerCase().includes(q);
    const matchNotes = item.notes ? item.notes.toLowerCase().includes(q) : false;
    const matchLoc = item.location ? item.location.toLowerCase().includes(q) : false;
    const matchDisc = item.discount.toLowerCase().includes(q);
    const matchType = item.type ? item.type.toLowerCase().includes(q) : false;

    return matchCategory && matchSpecialty && (matchName || matchDetails || matchNotes || matchLoc || matchDisc || matchType);
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} جهة متوفرة`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-magnifying-glass"></i>
        <h4 style="font-weight: 800; margin-bottom: 6px;">لا توجد نتائج مطابقة</h4>
        <p>جرب البحث بكلمات أخرى أو تغيير القسم المحدد</p>
        <button class="btn btn-outline-success mt-2" onclick="resetFilters()">عرض جميع الجهات</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const catObj = medicalCategories.find(c => c.id === item.category) || {};
    const isHighDiscount = item.discount.includes('30%') || item.discount.includes('25%');

    return `
      <div class="provider-card">
        <div>
          <div class="provider-card-top">
            <div class="provider-info">
              <span class="provider-category-tag">
                <i class="${catObj.icon || 'fa-solid fa-stethoscope'} text-success"></i>
                ${catObj.title || 'جهة طبية'}
              </span>
              <h3>${item.name}</h3>
              <div style="font-size: 0.8rem; font-weight: 600; color: #0284c7;">
                ${item.type || ''}
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
                <i class="fa-solid fa-circle-check text-success"></i>
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
  }).join('');
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

  // فلتر التخصص الطبي
  const specSelect = document.getElementById('specialtySelect');
  if (specSelect) {
    specSelect.addEventListener('change', (e) => {
      activeSpecialty = e.target.value;
      renderProviders();
    });
  }

  const clearSpecBtn = document.getElementById('clearSpecialtyBtn');
  if (clearSpecBtn) {
    clearSpecBtn.addEventListener('click', () => {
      activeSpecialty = 'all';
      if (specSelect) specSelect.value = 'all';
      renderProviders();
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
