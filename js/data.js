// إعدادات الربط المباشر مع Google Sheets
const GOOGLE_SHEETS_CONFIG = {
  enabled: true,
  sheetId: "1LuIiBooXXrQKo8F2My97dS5QwbJm69kq0cKjAHnvw7M",
  editUrl: "https://docs.google.com/spreadsheets/d/1LuIiBooXXrQKo8F2My97dS5QwbJm69kq0cKjAHnvw7M/edit",
  getCsvUrl: function() {
    return `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&tq&headers=1&_t=${Date.now()}`;
  }
};

/**
 * بيانات الخدمات الطبية والتعاقدات - شركة الحكمة للرعاية الصحية

 * يمكنك إضافة أو تعديل أي بيانات هنا بكل سهولة!
 */

const medicalCategories = [
  {
    id: "all",
    title: "الكل",
    titleEn: "ALL",
    icon: "fa-solid fa-border-all",
    count: 0
  },
  {
    id: "hospitals",
    title: "المستشفيات والمراكز",
    titleEn: "HOSPITALS",
    icon: "fa-solid fa-hospital",
    desc: "المستشفيات التخصصية ومراكز الجراحة والرعاية المتكاملة",
    descEn: "Hospitals & specialized medical centers",
    count: 0
  },
  {
    id: "labs",
    title: "معامل التحاليل",
    titleEn: "LABS",
    icon: "fa-solid fa-flask-vial",
    desc: "كافة الفحوصات والتحاليل الطبية الشاملة بأعلى دقة",
    descEn: "Medical laboratories & diagnostic tests",
    count: 0
  },
  {
    id: "pharmacies",
    title: "الصيدليات",
    titleEn: "PHARMACIES",
    icon: "fa-solid fa-prescription-bottle-medical",
    desc: "صيدليات خارجية لخصومات الأدوية ومستحضرات التجميل",
    descEn: "Pharmacies & cosmetic healthcare supplies",
    count: 0
  },
  {
    id: "doctors",
    title: "الأطباء والعيادات",
    titleEn: "DOCTORS",
    icon: "fa-solid fa-user-doctor",
    desc: "عيادات خارجية لكافة التخصصات الطبية ونخبة الأطباء",
    descEn: "Specialist doctors & outpatient clinics",
    count: 0
  },
  {
    id: "radiology",
    title: "مراكز الأشعة والسونار",
    titleEn: "RADIOLOGY",
    icon: "fa-solid fa-x-ray",
    desc: "سونار، رنين، مقطعية، أشعة عادية ومراكز أشعة الأسنان",
    descEn: "Scan & radiology centers, ultrasound, X-ray",
    count: 0
  },
  {
    id: "dental",
    title: "عيادات الأسنان",
    titleEn: "DENTAL",
    icon: "fa-solid fa-tooth",
    desc: "كشف وتركيبات وعلاج وتجميل الأسنان وأشعة الأسنان",
    descEn: "Dental clinics, orthodontics & dental X-ray",
    count: 0
  },
  {
    id: "physiotherapy",
    title: "العلاج الطبيعي",
    titleEn: "PHYSIOTHERAPY",
    icon: "fa-solid fa-person-walking-with-cane",
    desc: "كشف وجلسات علاج طبيعي وتأهيل حركي وعمود فقري",
    descEn: "Physiotherapy & rehabilitation clinics",
    count: 0
  }
];

// القواعد العامة ونسب الخصم الأساسية المذكورة في العقد / الورقة
const generalOfferings = [
  {
    title: "عيادات خارجية جميع التخصصات",
    subtitle: "3 إلى 5 أطباء في كل تخصص طبي معتمد",
    discount: "20% - 30%",
    discountLabel: "خصم يتراوح بين 20% و 30%",
    icon: "fa-solid fa-stethoscope",
    category: "doctors",
    details: "كشف واستشارات طبية لدى نخبة من الأطباء الاستشاريين والأخصائيين بمختلف التخصصات."
  },
  {
    title: "معامل تحاليل شاملة",
    subtitle: "تنفيذ كافة الفحوصات الطبية بأحدث الأجهزة",
    discount: "30%",
    discountLabel: "خصم 30% على كل شغل المعمل",
    icon: "fa-solid fa-vial-circle-check",
    category: "labs",
    details: "كل شغل المعمل يتم تنفيذه في (معمل شلبي) و (معمل مبرة العصافرة) بأعلى معايير الدقة والجودة."
  },
  {
    title: "صيدليات خارجية",
    subtitle: "توفير الأدوية المحلية ومستحضرات العناية والتجميل",
    discount: "10%",
    discountLabel: "خصم 10% أدوية ومستحضرات تجميل",
    icon: "fa-solid fa-capsules",
    category: "pharmacies",
    details: "خصم 10% على الأدوية المحلية، وخصومات على مستحضرات التجميل والعناية الشخصية."
  },
  {
    title: "عيادات أشعة وسونار",
    subtitle: "مراكز الأشعة والموجات الصوتية المعتمدة",
    discount: "20% - 25%",
    discountLabel: "خصم 25% على السونار و 20% على الأشعة",
    icon: "fa-solid fa-radiation",
    category: "radiology",
    details: "يشمل السونار، الأشعة العادية، المقطعية والرنين من خلال كبرى مراكز الأشعة المعتمدة."
  },
  {
    title: "عيادات الأسنان",
    subtitle: "فحص وعلاج وتركيبات الأسنان",
    discount: "15% - 25%",
    discountLabel: "خصم 25% كشف + 15% تركيبات",
    icon: "fa-solid fa-tooth",
    category: "dental",
    details: "خصم 25% على كشف عيادات الأسنان، وكذلك خصم 15% على التركيبات الثابتة والمتحركة."
  },
  {
    title: "مراكز العلاج الطبيعي",
    subtitle: "جلسات التأهيل وإصابات الملاعب والعمود الفقري",
    discount: "20%",
    discountLabel: "خصم 20% على الكشف والجلسات",
    icon: "fa-solid fa-heart-pulse",
    category: "physiotherapy",
    details: "خصم فوري 20% على الكشف المبدئي وجلسات العلاج الطبيعي والتأهيل الطبي."
  }
];

// قائمة المراكز الطبية والجهات المذكورة بالورقة مع إمكانية إضافة بيانات جديدة لا نهائية
const medicalProviders = [
  // المستشفيات والمراكز المتعاقد معها
  {
    id: 1,
    name: "مستشفى كونكور",
    category: "hospitals",
    type: "مستشفى تخصصي",
    discount: "20%",
    discountType: "percentage",
    details: "تقديم كافة الخدمات الطبية والعمليات والإقامة والعيادات بنسبة الخصم المتفق عليها.",
    notes: "تعاقد مباشر مع شركة الحكمة",
    location: "دمنهور / البحيرة",
    phone: "0450000000",
    isFeatured: true
  },
  {
    id: 2,
    name: "مستشفى الفيروز",
    category: "hospitals",
    type: "مستشفى عام وتخصصي",
    discount: "20%",
    discountType: "percentage",
    details: "خصم 20% على الخدمات الطبية والفحوصات والعمليات للمشتركين ببطاقة الحكمة.",
    notes: "تعاقد رسمي معتمد",
    location: "دمنهور / البحيرة",
    phone: "0450000000",
    isFeatured: true
  },
  {
    id: 3,
    name: "مركز النيل للقلب",
    category: "hospitals",
    type: "مركز تخصصي في القلب والأوعية الدموية",
    discount: "20%",
    discountType: "percentage",
    details: "كشف ورسم قلب وإيكو وقسطرة وفحوصات أمراض القلب والأوعية الدموية بخصم 20%.",
    notes: "مركز متخصص متميز",
    location: "دمنهور / البحيرة",
    phone: "0450000000",
    isFeatured: true
  },
  {
    id: 4,
    name: "مركز دمنهور للعيون",
    category: "hospitals",
    type: "مركز تخصصي لجراحة وطب العيون",
    discount: "20%",
    discountType: "percentage",
    details: "كشوفات وفحوصات الشبكية والليزك والمياه البيضاء وعمليات العيون بخصم 20%.",
    notes: "نخبة استشاريي وجراحي العيون",
    location: "دمنهور - شارع الجمهورية",
    phone: "0450000000",
    isFeatured: true
  },

  // معامل التحاليل
  {
    id: 5,
    name: "معمل شلبي للتحاليل الطبية",
    category: "labs",
    type: "معمل تحاليل طبية معتمد",
    discount: "30%",
    discountType: "percentage",
    details: "خصم 30% على كل شغل المعمل (تحاليل دم، سكر، وظائف كبد وكلى، هرمونات، باثولوجي).",
    notes: "يتم تنفيذ كل شغل المعمل في معمل شلبي المعتمد",
    location: "دمنهور وفروعه",
    phone: "0450000000",
    isFeatured: true
  },
  {
    id: 6,
    name: "معمل مبرة العصافرة",
    category: "labs",
    type: "معمل تحاليل وفحوصات دقيقة",
    discount: "30%",
    discountType: "percentage",
    details: "خصم 30% على جميع التحاليل والفحوصات الطبية المعتمدة للمشتركين.",
    notes: "يتم تنفيذ كافة التحاليل بأعلى تقنيات الجودة",
    location: "العصافرة / دمنهور والفروع",
    phone: "0450000000",
    isFeatured: true
  },

  // مراكز الأشعة والسونار
  {
    id: 7,
    name: "عيادات الأشعة والسونار (عام)",
    category: "radiology",
    type: "فحوصات الموجات فوق الصوتية",
    discount: "25%",
    discountType: "percentage",
    details: "خصم 25% على عمل فحوصات السونار للبطن والحوض والحمل وسونار الأنسجة.",
    notes: "خصم 25% على السونار",
    location: "المراكز المعتمدة",
    phone: "0450000000",
    isFeatured: true
  },
  {
    id: 8,
    name: "مركز هاني عباده للأشعة",
    category: "radiology",
    type: "مركز متكامل للأشعة التشخيصية",
    discount: "20%",
    discountType: "percentage",
    details: "خصم 20% على جميع الأشعات العادية والمقطعية والموجات الصوتية (ما عدا أشعة الصبغات).",
    notes: "خصم 20% ما عدا أشعة الصبغات",
    location: "دمنهور",
    phone: "0450000000",
    isFeatured: true
  },
  {
    id: 9,
    name: "المستقبل للأشعة",
    category: "radiology",
    type: "مركز أشعة ورنين مغناطيسي",
    discount: "20%",
    discountType: "percentage",
    details: "خصم 20% على الفحوصات التشخيصية والأشعة السينية والتلفزيونية.",
    notes: "تعاقد مباشر بنسبة 20%",
    location: "دمنهور",
    phone: "0450000000",
    isFeatured: true
  },
  {
    id: 10,
    name: "مراكز عمل الأشعة على الأسنان (Dental X-Ray)",
    category: "radiology",
    type: "بانوراما وأشعة مقطعية للأسنان CBCT",
    discount: "20%",
    discountType: "percentage",
    details: "خصم 20% على تصوير أشعة البانوراما، السيفالومتريك والأشعة المقطعية ثلاثية الأبعاد للأسنان.",
    notes: "خصم 20% على جميع مراكز أشعة الأسنان المعتمدة",
    location: "المراكز المتعاقدة",
    phone: "0450000000",
    isFeatured: true
  },

  // عيادات الأسنان
  {
    id: 11,
    name: "عيادات طب وجراحة الأسنان",
    category: "dental",
    type: "عيادات متخصصة بالأسنان",
    discount: "15% - 25%",
    discountType: "mixed",
    details: "خصم 25% على قيمة الكشف الطبي والفحص، وخصم 15% على جميع أنواع التركيبات والزراعة.",
    notes: "25% كشف + 15% تركيبات",
    location: "شبكة العيادات المعتمدة",
    phone: "0450000000",
    isFeatured: true
  },

  // عيادات وأطباء في جميع التخصصات
  {
    id: 12,
    name: "عيادات خارجية - باطنة وقلب وأطفال وجراحة وعظام",
    category: "doctors",
    type: "شبكة الأطباء والاستشاريين",
    discount: "20% - 30%",
    discountType: "range",
    details: "يتوفر في كل تخصص طبي من 3 إلى 5 أطباء معتمدين، ويتراوح الخصم للكشف الطبي بين 20% إلى 30%.",
    notes: "3 - 5 أطباء في كل تخصص طبي",
    location: "مختلف العيادات والمناطق",
    phone: "0450000000",
    isFeatured: true
  },

  // الصيدليات الخارجية
  {
    id: 13,
    name: "صيدليات خارجية معتمدة",
    category: "pharmacies",
    type: "صيدليات وصرف الروشتات",
    discount: "10%",
    discountType: "percentage",
    details: "عمل خصم 10% على كافة الأدوية المحلية، بالإضافة لخصومات مميزة على مستحضرات التجميل.",
    notes: "خصم 10% أدوية محلية ومستحضرات تجميل",
    location: "شبكة الصيدليات المتعاقدة",
    phone: "0450000000",
    isFeatured: true
  },

  // مراكز العلاج الطبيعي
  {
    id: 14,
    name: "مراكز للعلاج الطبيعي والتأهيل",
    category: "physiotherapy",
    type: "علاج طبيعي وتأهيل حركي",
    discount: "20%",
    discountType: "percentage",
    details: "خصم 20% على الكشف الطبي الأولي وكذلك على جميع جلسات العلاج الطبيعي والتأهيل الحركي.",
    notes: "خصم 20% (كشف وجلسات)",
    location: "المراكز المعتمدة",
    phone: "0450000000",
    isFeatured: true
  }
];

// معلومات الشركة والتواصل السريع
const companyInfo = {
  nameAr: "شركة الحكمة للرعاية الصحية",
  nameEn: "Elhekma Healthy Care",
  slogan: "رعايتكم الصحية أولويتنا - أفضل الخصومات الطبية في شبكة واحدة",
  whatsappNumber: "+201000000000", // يمكنك تغييره لرقم الواتساب الفعلي
  whatsappDisplay: "010 0000 0000",
  whatsappMessage: "السلام عليكم، أرغب في الاستفسار عن كارت خدمات وخصومات شركة الحكمة للرعاية الصحية",
  phone: "01000000000",
  email: "info@elhekma-care.com",
  address: "دمنهور - البحيرة - مصر"
};
