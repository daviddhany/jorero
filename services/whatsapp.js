function normalizeEgyptPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (/^01\d{9}$/.test(digits)) return '2' + digits;
  if (/^201\d{9}$/.test(digits)) return digits;
  return digits;
}

function isConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function sendWhatsAppText(to, body) {
  const phone = normalizeEgyptPhone(to);
  if (!phone || !body) return { ok: false, skipped: true, reason: 'missing phone or body' };
  if (!isConfigured()) {
    console.log('[WhatsApp skipped] Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID to .env');
    console.log('[WhatsApp message]', phone, body);
    return { ok: false, skipped: true, reason: 'not configured' };
  }

  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { preview_url: false, body }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) console.error('WhatsApp error:', data);
  return { ok: response.ok, data };
}

function orderCreatedMessage(order) {
  return `أهلاً ${order.customerName}\nتم استلام طلبك من Jorero بنجاح ✅\nرقم الطلب: ${order._id}\nالإجمالي: ${Number(order.total || 0).toLocaleString('ar-EG')} ج\nهنكلمك لتأكيد التفاصيل.`;
}

function formatOrderItems(order) {
  return (order.items || []).map((item, index) => {
    return `${index + 1}) ${item.name} | المقاس: ${item.size || '-'} | اللون: ${item.color || '-'} | الكمية: ${item.quantity || 1} | الإجمالي: ${Number(item.subtotal || 0).toLocaleString('ar-EG')} ج`;
  }).join('\n');
}

function ownerNewOrderMessage(order) {
  const itemsText = formatOrderItems(order) || '-';
  return `طلب جديد من Jorero 🛒\nالعميل: ${order.customerName}\nالموبايل: ${order.phone}\nالمنتجات:\n${itemsText}\nالإجمالي: ${Number(order.total || 0).toLocaleString('ar-EG')} ج\nالعنوان: ${order.address}`;
}

function statusMessage(order) {
  const labels = {
    pending: 'لسه قيد المراجعة',
    processing: 'جاري التجهيز',
    shipped: 'خرج للتوصيل',
    done: 'تم التنفيذ',
    cancelled: 'تم إلغاؤه'
  };
  return `تحديث طلب Jorero ✅\nرقم الطلب: ${order._id}\nالحالة الحالية: ${labels[order.status] || order.status}`;
}

module.exports = {
  sendWhatsAppText,
  orderCreatedMessage,
  ownerNewOrderMessage,
  statusMessage
};
