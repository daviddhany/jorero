const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'site' },
  heroEyebrow: { type: String, default: 'JORERO ONLINE SHOP' },
  heroEyebrowEn: { type: String, default: 'JORERO ONLINE SHOP' },
  heroTitle: { type: String, default: 'Wear your mood' },
  heroTitleEn: { type: String, default: 'Wear your mood' },
  heroSubtitle: { type: String, default: 'متخصصين في تصنيع وبيع الملابس الرجالي والحريمي والأطفالي. المصنع والمحل في مكان واحد، عشان تلاقي ذوقك ومقاسك بسهولة.' },
  heroSubtitleEn: { type: String, default: 'Fashion for men, women and kids in one place. Find your style and size easily.' },
  heroPrimaryText: { type: String, default: 'تسوق الآن' },
  heroPrimaryTextEn: { type: String, default: 'Shop Now' },
  heroImage: { type: String, default: '' },
  heroImages: { type: [String], default: [] },
  homeNoteTitle: { type: String, default: 'رجالي وحريمي وأطفالي في مكان واحد' },
  homeNoteTitleEn: { type: String, default: 'Men, women and kids in one place' },
  homeNoteText: { type: String, default: 'نوفر عليكم لف 3 محلات في محل واحد. تصنيع وتوريد جملة وقطاعي.' },
  homeNoteTextEn: { type: String, default: 'A complete clothing collection with retail and wholesale options.' },
  deliveryPrice: { type: Number, default: 50 },
  defaultSizes: { type: [String], default: ['2','4','6','8','S','M','L','XL','XXL','3XL','4XL'] },
  categoryOptions: { type: [String], default: ['رجالي','حريمي','أطفالي','تيشيرتات','قمصان','بناطيل','جينز','أطقم','جاكيت','سويت شيرت'] },
  categoryOptionsEn: { type: [String], default: ['Men','Women','Kids','T-Shirts','Shirts','Pants','Jeans','Sets','Jackets','Sweatshirts'] }
}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);
