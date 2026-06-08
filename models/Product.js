const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  oldPrice: Number,
  offerText: String,
  offerBuyQty: { type: Number, default: 0 },
  offerDiscountPercent: { type: Number, default: 0 },
  description: String,
  images: [String],
  colorImages: [{
    color: String,
    image: String
  }],
  sizes: [String],
  colors: [String],
  stock: { type: Number, default: 1 },
  featured: { type: Boolean, default: false },
  bestSeller: { type: Boolean, default: false },
  newArrival: { type: Boolean, default: false },
  offer: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
