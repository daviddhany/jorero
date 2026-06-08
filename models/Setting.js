const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'site' },
  heroEyebrow: { type: String, default: 'JORERO ONLINE SHOP' },
  heroTitle: { type: String, default: 'Wear your mood' },
  heroSubtitle: { type: String, default: 'متخصصين في تصنيع وبيع الملابس الرجالي والحريمي والأطفالي. المصنع والمحل في مكان واحد، عشان تلاقي ذوقك ومقاسك بسهولة.' },
  heroPrimaryText: { type: String, default: 'تسوق الآن' },
  heroImage: { type: String, default: '/public/uploads/polo-set-900.jpg' },
  heroImages: { type: [String], default: ['/public/uploads/polo-set-900.jpg','/public/uploads/two-polo-850.jpg','/public/uploads/pink-shirt-1050.jpg'] },
  homeNoteTitle: { type: String, default: 'رجالي وحريمي وأطفالي في مكان واحد' },
  homeNoteText: { type: String, default: 'نوفر عليكم لف 3 محلات في محل واحد. تصنيع وتوريد جملة وقطاعي.' },
  deliveryPrice: { type: Number, default: 50 },
  defaultSizes: { type: [String], default: ['2','4','6','8','S','M','L','XL','XXL','3XL','4XL'] }
}, { timestamps: true });

module.exports = mongoose.model('Setting', SettingSchema);
