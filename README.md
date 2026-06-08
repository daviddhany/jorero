# Jorero Online Shop

Online shop for Jorero built mainly with Node.js, Express, EJS templates, HTML, CSS, and vanilla JavaScript. It includes products, basket, checkout, orders dashboard, delivery price settings, editable product sizes, image gallery, color images, and a mobile friendly black/white theme.

## Run locally

```bash
copy .env.example .env
npm install
npm run seed
npm run dev
```

If `node_modules` exists already, you can run directly:

```bash
npm run seed
npm run dev
```

Admin URL: `/marly-dashboard/login`

Default admin:
- username: `admin`
- password: `12345`


## Notes

- Kids sizes `2, 4, 6, 8` are included by default.
- Admin can edit the global size list from `/marly-dashboard/settings`.
- Admin can still add product-specific sizes manually from the product form.

## New business features added

### Professional image upload
- Product upload now supports multiple images with admin preview and drag/drop.
- If `sharp` is installed, uploads are automatically resized and converted to WebP.
- If `sharp` is not available, uploads still work normally with the original file type.

### WhatsApp notifications
Add these values to `.env` to enable WhatsApp Cloud API:

```env
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
SHOP_OWNER_WHATSAPP=201XXXXXXXXX
```

If the values are empty, the app will not crash; it will only log the WhatsApp message in the console.

### Reports and sales
Open:

```txt
/marly-dashboard/reports
```

Includes daily sales, monthly sales, total sales, average order value, open orders, products count, status breakdown, and top-selling products.

### Multiple roles
Roles added:

- `super_admin`
- `admin`
- `manager`
- `employee`

Open:

```txt
/marly-dashboard/admins
```

Employees can manage orders. Managers can manage products/settings/reports. Admins can manage users. Super admins can do everything.

### No online payment
Online payment was intentionally not added in this version.
