const router = require('express').Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { hasCloudinaryConfig, uploadBuffer, deleteByUrl } = require('../services/cloudinary');
const Product = require('../models/Product');
const Admin = require('../models/Admin');
const Setting = require('../models/Setting');
const Order = require('../models/Order');
const { sendWhatsAppText, statusMessage } = require('../services/whatsapp');

const uploadDir = path.join(__dirname, '../public/uploads');
const FALLBACK_SIZES = ['2','4','6','8','S','M','L','XL','XXL','3XL','4XL'];
const ROLES = ['super_admin', 'admin', 'manager', 'employee'];
const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', manager: 'Manager', employee: 'Employee' };
const STATUS_LABELS = { pending: 'لسه موجودة', processing: 'جاري التجهيز', shipped: 'خرج للتوصيل', done: 'خلصت', cancelled: 'ملغي' };

// Local uploads are used only as a fallback when Cloudinary env vars are missing.
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 30 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'))
});

function auth(req, res, next) {
  if (req.session.admin) return next();
  return res.redirect('/marly-dashboard/login');
}

function roleRank(role) {
  return { employee: 1, manager: 2, admin: 3, super_admin: 4 }[role] || 0;
}

function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.session.admin && req.session.admin.role;
    if (allowed.includes(role) || role === 'super_admin') return next();
    return res.status(403).send('غير مسموح لك بالدخول لهذه الصفحة');
  };
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function removeFile(publicPath) {
  if (!publicPath) return;
  if (String(publicPath).includes('res.cloudinary.com')) {
    deleteByUrl(publicPath);
    return;
  }
  if (!publicPath.startsWith('/public/uploads/')) return;
  const filePath = path.join(__dirname, '..', publicPath.replace('/public/', 'public/'));
  fs.unlink(filePath, () => {});
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.map(v => String(v).trim()).filter(Boolean) : String(value).split(',').map(s => s.trim()).filter(Boolean);
}

function mergeManual(selected, manual) {
  const values = [...normalizeArray(selected), ...normalizeArray(manual)];
  return [...new Set(values.map(v => String(v).trim()).filter(Boolean))];
}

function uniqueValues(values) {
  return [...new Set(normalizeArray(values).map(v => String(v).trim()).filter(Boolean))];
}

async function saveUpload(file, prefix = 'product') {
  const safePrefix = String(prefix).replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'image';

  if (hasCloudinaryConfig()) {
    return uploadBuffer(file.buffer, `jorero/${safePrefix}`);
  }

  // Fallback for local development only. Do not rely on this on Cloud Run.
  const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safePrefix}`;
  const ext = path.extname(file.originalname || '') || '.jpg';
  const filename = `${base}${ext}`;
  await fs.promises.writeFile(path.join(uploadDir, filename), file.buffer);
  return '/public/uploads/' + filename;
}

async function saveFiles(files, prefix) {
  const list = [];
  for (const file of files || []) list.push(await saveUpload(file, prefix));
  return list;
}

async function getSiteSettings() {
  const settings = await Setting.findOneAndUpdate(
    { key: 'site' },
    { $setOnInsert: { key: 'site' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  if (!settings.defaultSizes || !settings.defaultSizes.length) settings.defaultSizes = FALLBACK_SIZES;
  return settings;
}

function productPayload(body) {
  return {
    name: body.name,
    category: body.category,
    price: Number(body.price || 0),
    oldPrice: body.oldPrice ? Number(body.oldPrice) : undefined,
    description: body.description,
    offerText: body.offerText || '',
    offerBuyQty: Number(body.offerBuyQty || 0),
    offerDiscountPercent: Number(body.offerDiscountPercent || 0),
    sizes: mergeManual(body.sizes, body.customSizes),
    colors: mergeManual(body.colors, body.customColors),
    stock: Number(body.stock || 1),
    featured: !!body.featured,
    bestSeller: !!body.bestSeller,
    newArrival: !!body.newArrival,
    offer: !!body.offer,
    active: !!body.active
  };
}

async function buildColorImages(body, files) {
  const colorNames = toArray(body.colorImageNames);
  const uploaded = await saveFiles(((files && files.colorImages) || []), 'color');
  const result = [];
  uploaded.forEach((image, index) => {
    const color = String(colorNames[index] || '').trim();
    if (color && image) result.push({ color, image });
  });
  return result;
}

function normalizeColorImages(value) {
  const arr = toArray(value);
  return arr.map(item => {
    try { return JSON.parse(item); } catch (e) { return null; }
  }).filter(item => item && item.color && item.image);
}

router.get('/login', (req, res) => {
  res.render('admin/login', { error: null, title: 'دخول الأدمن' });
});

router.post('/login', async (req, res) => {
  const admin = await Admin.findOne({ username: req.body.username, active: { $ne: false } });
  if (!admin || !await bcrypt.compare(req.body.password, admin.password)) {
    return res.render('admin/login', { error: 'بيانات الدخول غير صحيحة', title: 'دخول الأدمن' });
  }
  req.session.admin = { id: admin._id, username: admin.username, role: admin.role || 'admin' };
  res.redirect('/marly-dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/marly-dashboard/login'));
});

router.get('/', auth, async (req, res) => {
  const products = await Product.find().sort('-createdAt').lean();
  res.render('admin/dashboard', { products, title: 'لوحة التحكم', ROLE_LABELS });
});

router.get('/reports', auth, requireRole('manager', 'admin'), async (req, res) => {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const doneFilter = { status: { $nin: ['cancelled'] } };
  const [orders, todayOrders, monthOrders, productsCount, pendingCount] = await Promise.all([
    Order.find(doneFilter).sort('-createdAt').lean(),
    Order.find({ ...doneFilter, createdAt: { $gte: startToday } }).lean(),
    Order.find({ ...doneFilter, createdAt: { $gte: startMonth } }).lean(),
    Product.countDocuments(),
    Order.countDocuments({ status: { $in: ['pending', 'processing', 'shipped'] } })
  ]);
  const sum = list => list.reduce((s, o) => s + Number(o.total || 0), 0);
  const byStatus = {};
  const productSales = {};
  orders.forEach(order => {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    (order.items || []).forEach(item => {
      const key = item.name || 'منتج';
      if (!productSales[key]) productSales[key] = { name: key, qty: 0, total: 0 };
      productSales[key].qty += Number(item.quantity || 0);
      productSales[key].total += Number(item.subtotal || 0);
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const stats = {
    ordersCount: orders.length,
    todaySales: sum(todayOrders),
    monthSales: sum(monthOrders),
    totalSales: sum(orders),
    averageOrder: orders.length ? Math.round(sum(orders) / orders.length) : 0,
    productsCount,
    pendingCount,
    byStatus
  };
  res.render('admin/reports', { title: 'تقارير ومبيعات', stats, topProducts, STATUS_LABELS });
});

router.get('/admins', auth, requireRole('admin'), async (req, res) => {
  const admins = await Admin.find().sort('-createdAt').lean();
  res.render('admin/admins', { title: 'المستخدمين والصلاحيات', admins, ROLES, ROLE_LABELS, error: null });
});

router.post('/admins', auth, requireRole('admin'), async (req, res) => {
  try {
    const role = ROLES.includes(req.body.role) ? req.body.role : 'employee';
    if (roleRank(role) >= roleRank(req.session.admin.role) && req.session.admin.role !== 'super_admin') {
      throw new Error('لا يمكنك إنشاء مستخدم بنفس صلاحيتك أو أعلى');
    }
    await Admin.create({
      username: req.body.username,
      password: await bcrypt.hash(req.body.password, 10),
      role,
      active: !!req.body.active
    });
    res.redirect('/marly-dashboard/admins');
  } catch (err) {
    const admins = await Admin.find().sort('-createdAt').lean();
    res.render('admin/admins', { title: 'المستخدمين والصلاحيات', admins, ROLES, ROLE_LABELS, error: err.message || 'حدث خطأ' });
  }
});

router.post('/admins/:id', auth, requireRole('admin'), async (req, res) => {
  const target = await Admin.findById(req.params.id);
  if (!target) return res.redirect('/marly-dashboard/admins');
  if (String(target._id) === String(req.session.admin.id) && !req.body.active) return res.redirect('/marly-dashboard/admins');
  const payload = {
    role: ROLES.includes(req.body.role) ? req.body.role : target.role,
    active: !!req.body.active
  };
  if (req.body.password) payload.password = await bcrypt.hash(req.body.password, 10);
  await Admin.findByIdAndUpdate(req.params.id, payload);
  res.redirect('/marly-dashboard/admins');
});

router.get('/orders', auth, async (req, res) => {
  const status = req.query.status || 'active';
  let filter = { status: { $nin: ['done', 'cancelled'] } };
  if (['pending', 'processing', 'shipped', 'done', 'cancelled'].includes(status)) filter = { status };
  const orders = await Order.find(filter).sort('-createdAt').lean();
  res.render('admin/orders', { orders, status, STATUS_LABELS, title: status === 'done' ? 'الطلبات المنتهية' : 'طلبات العملاء' });
});

router.post('/orders/:id/status', auth, async (req, res) => {
  const allowed = ['pending', 'processing', 'shipped', 'done', 'cancelled'];
  const nextStatus = allowed.includes(req.body.status) ? req.body.status : 'pending';
  const order = await Order.findByIdAndUpdate(req.params.id, { status: nextStatus, statusNotifiedAt: new Date() }, { new: true }).lean();
  if (order && req.body.notifyCustomer === 'on') {
    sendWhatsAppText(order.phone, statusMessage(order)).catch(err => console.error('WhatsApp status notification failed:', err.message));
  }
  res.redirect('/marly-dashboard/orders' + (req.body.backStatus ? `?status=${encodeURIComponent(req.body.backStatus)}` : ''));
});

router.get('/settings', auth, requireRole('manager', 'admin'), async (req, res) => {
  const settings = await getSiteSettings();
  res.render('admin/settings', { settings, title: 'تخصيص الواجهة' });
});

router.post('/settings', auth, requireRole('manager', 'admin'), upload.array('heroImageFiles', 8), async (req, res) => {
  const body = req.body;
  const current = await Setting.findOneAndUpdate({ key: 'site' }, { $setOnInsert: { key: 'site' } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  const removeHeroImages = toArray(body.removeHeroImages);
  let heroImages = (current.heroImages && current.heroImages.length ? current.heroImages : [current.heroImage]).filter(Boolean);

  if (removeHeroImages.length) {
    heroImages = heroImages.filter(img => {
      if (removeHeroImages.includes(img)) {
        removeFile(img);
        return false;
      }
      return true;
    });
  }

  const newHeroImages = await saveFiles(req.files || [], 'hero');
  heroImages = [...heroImages, ...newHeroImages];
  if (!heroImages.length) heroImages = ['/public/uploads/polo-set-900.jpg'];

  const payload = {
    heroEyebrow: body.heroEyebrow || '',
    heroTitle: body.heroTitle || '',
    heroSubtitle: body.heroSubtitle || '',
    heroPrimaryText: body.heroPrimaryText || 'تسوق الآن',
    deliveryPrice: Number(body.deliveryPrice || 0),
    homeNoteTitle: body.homeNoteTitle || '',
    homeNoteText: body.homeNoteText || '',
    defaultSizes: uniqueValues(body.defaultSizes).length ? uniqueValues(body.defaultSizes) : FALLBACK_SIZES,
    heroImages,
    heroImage: heroImages[0]
  };
  await Setting.findOneAndUpdate({ key: 'site' }, payload, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.redirect('/marly-dashboard/settings');
});

router.get('/products/new', auth, requireRole('manager', 'admin'), async (req, res) => {
  const settings = await getSiteSettings();
  res.render('admin/form', { product: null, settings, title: 'إضافة منتج' });
});

router.post('/products', auth, requireRole('manager', 'admin'), upload.fields([{ name: 'images', maxCount: 12 }, { name: 'colorImages', maxCount: 12 }]), async (req, res) => {
  await Product.create({
    ...productPayload(req.body),
    images: await saveFiles(((req.files && req.files.images) || []), 'product'),
    colorImages: await buildColorImages(req.body, req.files)
  });
  res.redirect('/marly-dashboard');
});

router.get('/products/:id/edit', auth, requireRole('manager', 'admin'), async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  const settings = await getSiteSettings();
  res.render('admin/form', { product, settings, title: 'تعديل منتج' });
});

router.put('/products/:id', auth, requireRole('manager', 'admin'), upload.fields([{ name: 'images', maxCount: 12 }, { name: 'colorImages', maxCount: 12 }]), async (req, res) => {
  const product = await Product.findById(req.params.id);
  const removeImages = toArray(req.body.removeImages);
  const removeColorImages = normalizeColorImages(req.body.removeColorImages);

  if (removeImages.length) {
    product.images = (product.images || []).filter(img => {
      if (removeImages.includes(img)) {
        removeFile(img);
        return false;
      }
      return true;
    });
  }

  if (removeColorImages.length) {
    const removeKeys = new Set(removeColorImages.map(item => item.color + '|' + item.image));
    product.colorImages = (product.colorImages || []).filter(item => {
      const key = item.color + '|' + item.image;
      if (removeKeys.has(key)) {
        removeFile(item.image);
        return false;
      }
      return true;
    });
  }

  const newImages = await saveFiles(((req.files && req.files.images) || []), 'product');
  Object.assign(product, productPayload(req.body));
  if (newImages.length) product.images = [...(product.images || []), ...newImages];
  const newColorImages = await buildColorImages(req.body, req.files);
  if (newColorImages.length) product.colorImages = [...(product.colorImages || []), ...newColorImages];

  await product.save();
  res.redirect('/marly-dashboard');
});

router.delete('/products/:id', auth, requireRole('admin'), async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    (product.images || []).forEach(removeFile);
    (product.colorImages || []).forEach(item => removeFile(item.image));
    await product.deleteOne();
  }
  res.redirect('/marly-dashboard');
});

module.exports = router;
