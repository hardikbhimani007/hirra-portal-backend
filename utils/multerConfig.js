// utils/multerConfig.js (CommonJS compatible)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Cached dynamic import so we don't import 'uuid' repeatedly
let _uuidMod;
async function uuidv4() {
  if (!_uuidMod) _uuidMod = await import('uuid');
  return _uuidMod.v4();
}

function handleBase64Upload(baseUploadDir = 'uploads') {
  if (!fs.existsSync(baseUploadDir)) fs.mkdirSync(baseUploadDir, { recursive: true });

  return async (req, res, next) => {
    try {
      let base64String = req.body.profile_pictures;
      const userId = req.body.user_id || req.body.id;

      if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required" });
      }

      const userFolder = path.join(baseUploadDir, `user_${userId}`);
      if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });

      // If it's already a URL or empty, skip
      if (base64String && /^https?:\/\//.test(base64String)) return next();
      if (!base64String || base64String.trim() === '') return next();

      // Normalize potential whitespace/newlines in base64 payloads
      base64String = base64String.replace(/\s/g, '');

      if (base64String.startsWith('data:image')) {
        const matches = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) return res.status(400).json({ success: false, message: "Invalid base64 string" });

        const data = matches[2];
        const buffer = Buffer.from(data, 'base64');

        // Clear old files for this user
        const existingFiles = fs.readdirSync(userFolder);
        existingFiles.forEach(file => fs.unlinkSync(path.join(userFolder, file)));

        const filename = `${Date.now()}_${await uuidv4()}.webp`;
        const filePath = path.join(userFolder, filename);

        await sharp(buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 60 })
          .toFile(filePath);

        // Make it a web path, normalize backslashes if any
        req.body.profile_pictures = `/${path.join(userFolder, filename)}`.replace(/\\/g, '/');
      }
      next();
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}

async function saveChatImage(base64String, chatFolder = 'uploads/chat_images') {
  if (!base64String || !base64String.startsWith('data:image')) return null;

  if (!fs.existsSync(chatFolder)) fs.mkdirSync(chatFolder, { recursive: true });

  const matches = base64String.replace(/\s/g, '').match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid base64 image string');

  const data = matches[2];
  const buffer = Buffer.from(data, 'base64');

  const filename = `${Date.now()}_${await uuidv4()}.webp`;
  const filePath = path.join(chatFolder, filename);

  await sharp(buffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 60 })
    .toFile(filePath);

  return `/${path.join(chatFolder, filename)}`.replace(/\\/g, '/');
}

async function saveChatMedia(base64String, folder = 'uploads/chat_media') {
  if (!base64String || !base64String.startsWith('data:')) return null;

  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const matches = base64String.replace(/\s/g, '').match(/^data:([\w\/\-\+\.]+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid base64 media string');

  const mimeType = matches[1];
  const data = matches[2];
  const buffer = Buffer.from(data, 'base64');

  let filename, filePath;

  if (mimeType.startsWith('image/')) {
    filename = `${Date.now()}_${await uuidv4()}.webp`;
    filePath = path.join(folder, filename);

    await sharp(buffer)
      .ensureAlpha()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 60 })
      .toFile(filePath);
  } else {
    const ext = (mimeType.split('/')[1] || 'bin').split(';')[0];
    filename = `${Date.now()}_${await uuidv4()}.${ext}`;
    filePath = path.join(folder, filename);
    fs.writeFileSync(filePath, buffer);
  }

  console.log('Saved file:', filePath);
  return `/${path.join(folder, filename)}`.replace(/\\/g, '/');
}

module.exports = { handleBase64Upload, saveChatImage, saveChatMedia };
