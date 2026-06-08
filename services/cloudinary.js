const { v2: cloudinary } = require('cloudinary');

function hasCloudinaryConfig() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

if (hasCloudinaryConfig()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

function uploadBuffer(buffer, folder = 'jorero/products') {
  if (!hasCloudinaryConfig()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1400, height: 1400, crop: 'limit' },
          { quality: 'auto:good', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}

function getPublicIdFromUrl(url) {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  try {
    const cleanUrl = String(url).split('?')[0];
    const marker = '/upload/';
    const uploadIndex = cleanUrl.indexOf(marker);
    if (uploadIndex === -1) return null;
    let pathAfterUpload = cleanUrl.slice(uploadIndex + marker.length);
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    return pathAfterUpload.replace(/\.[^.]+$/, '');
  } catch (e) {
    return null;
  }
}

async function deleteByUrl(url) {
  if (!hasCloudinaryConfig()) return;
  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.warn('Cloudinary delete failed:', err.message);
  }
}

module.exports = { hasCloudinaryConfig, uploadBuffer, deleteByUrl };
