const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  notes: String,
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    nameEn: String,
    price: Number,
    image: String,
    size: String,
    color: String,
    colorEn: String,
    quantity: { type: Number, default: 1 },
    subtotal: Number
  }],
  itemsTotal: { type: Number, default: 0 },
  deliveryPrice: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'done', 'cancelled'],
    default: 'pending'
  },
  whatsappNotifiedAt: Date,
  statusNotifiedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
