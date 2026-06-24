require('dotenv').config();
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const helmet = require('helmet');
const methodOverride = require('method-override');
const Product = require('./models/Product');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

const app = express();
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jorero_shop';

async function dropOldSlugIndex() {
  try {
    await Product.collection.dropIndex('slug_1');
    console.log('Old slug index removed');
  } catch (err) {
    if (err && (err.codeName === 'IndexNotFound' || err.code === 27)) return;
    if (String(err.message || '').includes('index not found')) return;
    console.warn('Could not remove old slug index:', err.message);
  }
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', require('ejs').renderFile);
// Ensure HTML responses include charset
app.use((req, res, next) => {
  const origRender = res.render.bind(res);
  res.render = function(view, options, callback) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return origRender(view, options, callback);
  };
  next();
});
app.use(helmet({
  contentSecurityPolicy: false,
  xXssProtection: false,        // removes x-xss-protection (deprecated)
  xFrameOptions: false,         // removes X-Frame-Options (use CSP instead)
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use('/public', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: uri }),
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
}));
// Security headers on all responses
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.locals.formatPrice = n => Number(n || 0).toLocaleString('ar-EG') + ' ج';
app.use((req, res, next) => {
  res.locals.admin = req.session.admin;
  res.locals.cartCount = Array.isArray(req.session.cart) ? req.session.cart.length : 0;
  next();
});
app.use('/', require('./routes/store'));
app.use('/marly-dashboard', require('./routes/admin'));
app.use((req, res) => res.status(404).render('404', { title: 'الصفحة غير موجودة' }));


async function fixBadImagePaths() {
  try {
    const Setting = require('./models/Setting');
    const setting = await Setting.findOne({ key: 'site' });
    if (setting) {
      const cleaned = (setting.heroImages || []).filter(img => !String(img).startsWith('/public/uploads/'));
      if (cleaned.length !== (setting.heroImages || []).length) {
        setting.heroImages = cleaned;
        setting.heroImage = cleaned[0] || '';
        await setting.save();
        console.log('Fixed bad heroImages in DB');
      }
    }
    const Product = require('./models/Product');
    const products = await Product.find({ images: { $regex: '^/public/uploads/' } });
    for (const p of products) {
      p.images = (p.images || []).filter(img => !String(img).startsWith('/public/uploads/'));
      await p.save();
    }
    if (products.length) console.log(`Fixed bad images in ${products.length} products`);
  } catch(e) {
    console.warn('fixBadImagePaths error:', e.message);
  }
}

async function start() {
  try {
    await mongoose.connect(uri);
console.log('MongoDB connected');

await dropOldSlugIndex();
    await fixBadImagePaths();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log('http://localhost:' + port));
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
}

start();
