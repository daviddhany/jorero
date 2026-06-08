# Deploy Jorero on Render

This version is ready for Render Web Service with Node.js, MongoDB Atlas, and Cloudinary.

## 1) Push to GitHub

Upload this project to a GitHub repository.

## 2) Create Render Web Service

1. Open Render Dashboard.
2. New > Web Service.
3. Connect your GitHub repository.
4. Use these settings:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free is okay for testing/small traffic.

Render will automatically use the `PORT` it provides. Do not add `PORT` manually.

## 3) Environment Variables

Add these in Render > Environment:

```env
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
SESSION_SECRET=write_a_long_random_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SHOP_OWNER_WHATSAPP=201XXXXXXXXX
```

Optional WhatsApp Cloud API:

```env
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

## 4) Seed admin account

After the first deploy, open Render Shell and run:

```bash
npm run seed
```

Then login here:

```txt
/marly-dashboard/login
```

## Important notes

- Images are uploaded to Cloudinary, so they will not disappear when Render restarts.
- MongoDB must be Atlas or another hosted MongoDB URL. Do not use localhost on Render.
- Render Free services may sleep after inactivity, so the first request can be slow.
- Change the default admin password before giving the site to a client.
