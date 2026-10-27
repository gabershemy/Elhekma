/**
 * Elhekma Healthy Care - Main Logic
 * تحكم كامل في عرض البيانات، البحث الفوري، الفلترة وإضافة جهات جديدة
 */

// جلب البيانات من LocalStorage إن وجدت أو استخدام البيانات الافتراضية
let allProviders = [];
let activeCategory = 'all';
let searchQuery = '';

function initializeData() {
  const savedData = localStorage.getItem('elhekma_custom_providers');
  if (savedData) {
    try {
      const customItems = JSON.parse(savedData);
      allProviders = [...medicalProviders, ...customItems];
    } catch (e) {
      allProviders = [...medicalProviders];
    }
  } else {
    allProviders = [...medicalProviders];
  }

  updateCategoryCounts();
  renderCategoriesMockup();
  renderFilterTabs();
  renderPaperSummary();
  renderProviders();
  setupWhatsAppButton();
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

// رسم بطاقات الأقسام العلوية المطابقة تماماً لموك آب الصورة (Mockup Image 2)
function renderCategoriesMockup() {
  const container = document.getElementById('mockupCategoriesContainer');
  if (!container) return;

  // استبعاد "الكل" من البطاقات العريضة لتكون كفئات رئيسية مثل الموك آب
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

// رسم ملخص الورقة الرسمية (الخدمات المتوفرة ونسب الخصم الأساسية)
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

// رسم قائمة الجهات والخصومات (Providers)
function renderProviders() {
  const container = document.getElementById('providersListContainer');
  const countBadge = document.getElementById('providersCountBadge');
  if (!container) return;

  // فلترة حسب الفئة والبحث
  let filtered = allProviders.filter(item => {
    const matchCategory = (activeCategory === 'all' || item.category === activeCategory);
    
    if (!searchQuery) return matchCategory;

    const q = searchQuery.toLowerCase().trim();
    const matchName = item.name.toLowerCase().includes(q);
    const matchDetails = item.details.toLowerCase().includes(q);
    const matchNotes = item.notes ? item.notes.toLowerCase().includes(q) : false;
    const matchLoc = item.location ? item.location.toLowerCase().includes(q) : false;
    const matchDisc = item.discount.toLowerCase().includes(q);
    const matchType = item.type ? item.type.toLowerCase().includes(q) : false;

    return matchCategory && (matchName || matchDetails || matchNotes || matchLoc || matchDisc || matchType);
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} جهة طبية متوفرة`;
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
            <span><i class="fa-solid fa-shield-halved me-1 text-success"></i> تعاقد معتمد</span>
          </div>

          <div class="provider-actions">
            <a href="tel:${item.phone || companyInfo.phone}" class="btn-card-action btn-card-call">
              <i class="fa-solid fa-phone"></i>
              <span>اتصال</span>
            </a>
            <a href="https://wa.me/${formatWhatsAppNumber(companyInfo.whatsappNumber)}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن كارت الخصم والتعاقد مع: ' + item.name)}" 
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
  renderCategoriesMockup();
  renderFilterTabs();
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
  searchQuery = '';
  const searchInput = document.getElementById('mainSearchInput');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.style.display = 'none';

  renderCategoriesMockup();
  renderFilterTabs();
  renderProviders();
}

// ربط البحث الفوري
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

  // معالجة نموذج إضافة جهة جديدة
  const addForm = document.getElementById('addProviderForm');
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddNewProvider();
    });
  }
});

// إضافة جهة جديدة وحفظها في التخزين المحلي LocalStorage
function handleAddNewProvider() {
  const name = document.getElementById('newProviderName').value.trim();
  const category = document.getElementById('newProviderCategory').value;
  const discount = document.getElementById('newProviderDiscount').value.trim();
  const type = document.getElementById('newProviderType').value.trim();
  const location = document.getElementById('newProviderLocation').value.trim() || 'دمنهور / البحيرة';
  const phone = document.getElementById('newProviderPhone').value.trim() || companyInfo.phone;
  const details = document.getElementById('newProviderDetails').value.trim();
  const notes = document.getElementById('newProviderNotes').value.trim();

  if (!name || !discount) {
    alert('يرجى كتابة الاسم ونسبة الخصم على الأقل');
    return;
  }

  const newItem = {
    id: Date.now(),
    name,
    category,
    type: type || 'جهة طبية معتمدة',
    discount: discount.includes('%') ? discount : discount + '%',
    details: details || `خصم ${discount} لعملاء بطاقة الحكمة للرعاية الصحية.`,
    notes: notes || 'مضاف حديثاً للشبكة الطبية',
    location,
    phone,
    isCustom: true
  };

  // حفظ في التخزين المحلي
  let customItems = [];
  try {
    const saved = localStorage.getItem('elhekma_custom_providers');
    if (saved) customItems = JSON.parse(saved);
  } catch (err) {}

  customItems.push(newItem);
  localStorage.setItem('elhekma_custom_providers', JSON.stringify(customItems));

  // تحديث القائمة
  allProviders.push(newItem);
  updateCategoryCounts();
  renderCategoriesMockup();
  renderFilterTabs();
  renderProviders();

  // إغلاق النافذة وإعادة تعيين النموذج
  const modalEl = document.getElementById('addProviderModal');
  const modalInstance = bootstrap.Modal.getInstance(modalEl);
  if (modalInstance) modalInstance.hide();
  document.getElementById('addProviderForm').reset();

  alert('تمت إضافة الجهة الطبية بنجاح وحفظها في الموقع!');
}

// إعداد زر الواتساب السفلي
function setupWhatsAppButton() {
  const btn = document.getElementById('floatingWhatsAppBtn');
  if (btn) {
    const url = `https://wa.me/${formatWhatsAppNumber(companyInfo.whatsappNumber)}?text=${encodeURIComponent(companyInfo.whatsappMessage)}`;
    btn.setAttribute('href', url);
  }
}

function formatWhatsAppNumber(phone) {
  return phone.replace(/[^0-9]/g, '');
}
