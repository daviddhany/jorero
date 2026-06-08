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
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: uri }),
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
}));
app.locals.formatPrice = n => Number(n || 0).toLocaleString('ar-EG') + ' ج';
app.use((req, res, next) => { res.locals.admin = req.session.admin; next(); });
app.use('/', require('./routes/store'));
app.use('/marly-dashboard', require('./routes/admin'));
app.use((req, res) => res.status(404).render('404', { title: 'الصفحة غير موجودة' }));

async function start() {
  try {
    await mongoose.connect(uri);
console.log('MongoDB connected');

await dropOldSlugIndex();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log('http://localhost:' + port));
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
}

start();
