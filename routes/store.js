const router = require('express').Router();
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const Order = require('../models/Order');
const { sendWhatsAppText, orderCreatedMessage, ownerNewOrderMessage } = require('../services/whatsapp');

const info = {
  phone: '01016002162',
  whatsapp: '201212227833',
  address: '٩ شارع محمد رشاد شفيق السيوف شماعه، خلف قرية عبد الوهاب للمشويات',
  hours: 'متاحين يوميًا'
};

async function getSettings() {
  return await Setting.findOneAndUpdate({ key: 'site' }, { $setOnInsert: { key: 'site' } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
}
function cart(req){ if(!req.session.cart) req.session.cart = []; return req.session.cart; }
function cartTotals(items, deliveryPrice){
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  return { itemsTotal, deliveryPrice: Number(deliveryPrice || 0), total: itemsTotal + Number(deliveryPrice || 0) };
}

router.get('/', async (req, res) => {
  const products = await Product.find({ active: true }).sort('-createdAt').lean();
  const settings = await getSettings();
  res.render('home', { products, info, settings, title: 'Jorero | Online Shop' });
});

router.get('/products', async (req, res) => {
  const q = req.query.q || '';
  const cat = req.query.category || '';
  const min = Number(req.query.min) || 0;
  const max = Number(req.query.max) || 999999;
  let filter = { active: true, price: { $gte: min, $lte: max } };
  if (q) filter.name = { $regex: q, $options: 'i' };
  if (cat) filter.category = cat;
  const products = await Product.find(filter).sort('-createdAt').lean();
  res.render('products', { products, info, q, cat, min, max, title: 'منتجات Jorero' });
});

router.get('/product/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.redirect('/products');
  res.render('product', { product, info, title: product.name });
});

router.post('/cart/add/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product || !product.active) return res.redirect('/products');
  const quantity = Math.max(1, Number(req.body.quantity || 1));
  const selectedImage = req.body.image || (product.images && product.images[0]) || '/public/images/logo.png';

  // Keep the exact customer choices in the basket/order.
  // Some colors are chosen by clicking the color image, so we also fallback
  // to the color name linked with that image if the select value is empty.
  const selectedColorImage = (product.colorImages || []).find(item => item.image === selectedImage);
  const selectedSize = String(req.body.size || '').trim();
  const selectedColor = String(req.body.color || selectedColorImage?.color || '').trim();

  const hasSizes = (product.sizes || []).map(s => String(s || '').trim()).filter(Boolean).length > 0;
  const hasColors = [
    ...(product.colors || []).map(c => String(c || '').trim()),
    ...(product.colorImages || []).map(item => String(item.color || '').trim())
  ].filter(Boolean).length > 0;

  if ((hasSizes && !selectedSize) || (hasColors && !selectedColor)) {
    const message = 'اختار اللون والمقاس الأول';
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ ok: false, message });
    }
    return res.redirect('back');
  }

  const item = {
    product: product._id.toString(),
    name: product.name,
    price: Number(product.price || 0),
    image: selectedImage,
    size: selectedSize,
    color: selectedColor,
    quantity,
    subtotal: Number(product.price || 0) * quantity
  };
  cart(req).push(item);
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.json({ ok: true, message: 'تمت إضافة المنتج للسلة بنجاح', cartCount: cart(req).length });
  }
  res.redirect('back');
});

router.get('/cart', async (req, res) => {
  const settings = await getSettings();
  const items = cart(req);
  const totals = cartTotals(items, settings.deliveryPrice);
  res.render('cart', { items, totals, info, title: 'السلة' });
});

router.post('/cart/remove/:index', (req, res) => {
  const items = cart(req);
  const index = Number(req.params.index);
  if (!Number.isNaN(index)) items.splice(index, 1);
  res.redirect('/cart');
});

router.get('/checkout', async (req, res) => {
  const settings = await getSettings();
  const items = cart(req);
  if (!items.length) return res.redirect('/cart');
  const totals = cartTotals(items, settings.deliveryPrice);
  res.render('checkout', { items, totals, info, title: 'إتمام الطلب', error: null });
});

router.post('/checkout', async (req, res) => {
  const settings = await getSettings();
  const items = cart(req);
  const totals = cartTotals(items, settings.deliveryPrice);
  if (!items.length) return res.redirect('/cart');
  if (!req.body.customerName || !req.body.phone || !req.body.address) {
    return res.render('checkout', { items, totals, info, title: 'إتمام الطلب', error: 'اكتب الاسم ورقم التليفون والعنوان بالتفصيل' });
  }
  const cleanPhone = String(req.body.phone || '').trim();
  if (!/^01\d{9}$/.test(cleanPhone)) {
    return res.render('checkout', { items, totals, info, title: 'إتمام الطلب', error: 'رقم التليفون لازم يكون 11 رقم ويبدأ بـ 01 مثل 01012345678' });
  }
  const order = await Order.create({
    customerName: req.body.customerName,
    phone: cleanPhone,
    address: req.body.address,
    notes: req.body.notes || '',
    items,
    ...totals
  });
  sendWhatsAppText(order.phone, orderCreatedMessage(order))
    .then(() => Order.findByIdAndUpdate(order._id, { whatsappNotifiedAt: new Date() }).catch(() => {}))
    .catch(err => console.error('WhatsApp customer notification failed:', err.message));
  if (process.env.SHOP_OWNER_WHATSAPP) {
    sendWhatsAppText(process.env.SHOP_OWNER_WHATSAPP, ownerNewOrderMessage(order))
      .catch(err => console.error('WhatsApp owner notification failed:', err.message));
  }
  req.session.cart = [];
  res.redirect('/order-success/' + order._id);
});

router.get('/order-success/:id', async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) return res.redirect('/');
  res.render('order-success', { order, info, title: 'تم إرسال الطلب' });
});

module.exports = router;
