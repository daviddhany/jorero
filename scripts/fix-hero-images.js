// Run this once to clean bad /public/uploads/ paths from the database
require('dotenv').config();
const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const Product = require('../models/Product');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jorero_shop';

async function fix() {
  await mongoose.connect(uri);
  console.log('Connected to DB');

  // Fix Settings: remove any heroImages pointing to /public/uploads/
  const setting = await Setting.findOne({ key: 'site' });
  if (setting) {
    const before = setting.heroImages || [];
    const cleaned = before.filter(img => !img.startsWith('/public/uploads/'));
    console.log(`Settings heroImages: ${before.length} → ${cleaned.length}`);
    setting.heroImages = cleaned;
    if (!cleaned.length) setting.heroImage = '';
    await setting.save();
    console.log('Settings fixed ✓');
  }

  // Fix Products: remove any images pointing to /public/uploads/
  const products = await Product.find({});
  let fixedCount = 0;
  for (const p of products) {
    const before = p.images || [];
    const cleaned = before.filter(img => !img.startsWith('/public/uploads/'));
    if (cleaned.length !== before.length) {
      p.images = cleaned;
      await p.save();
      fixedCount++;
      console.log(`Fixed product: ${p.name}`);
    }
  }
  console.log(`Fixed ${fixedCount} products ✓`);

  await mongoose.disconnect();
  console.log('Done!');
}

fix().catch(e => { console.error(e); process.exit(1); });
