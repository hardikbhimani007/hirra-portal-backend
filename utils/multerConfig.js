// utils/base64Upload.js  (you can keep your old filename if you want)
const fs = require('fs/promises');
const fssync = require('fs');             // only for existsSync (fast check)
const path = require('path');
const { randomUUID } = require('crypto'); // ✅ no uuid package needed
const sharp = require('sharp');

const ensureDir = async (dir) => {
  if (!fssync.existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
};

const toWebPath = (p) => p.replace(/\\/g, '/').replace(/^.*?(\/uploads\/)/, '$1'); // keep /uploads/... from abs path

function handleBase64Upload(baseUploadDir = 'uploads') {
  const rootDir = path.isAbsolute(baseUploadDir)
    ? baseUploadDir
    : path.join(process.cwd(), baseUploadDir);

  return async (req, res, next) => {
    try {
      await ensureDir(rootDir);

      const base64String = req.body?.profile_pictures;
      const userId = req.body?.user_id || req.body?.id;

      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }

      const userFolder = path.join(rootDir, `user_${userId}`);
      await ensureDir(userFolder);

      // If it's already a URL or empty, skip processing
      if (base64String && /^https?:\/\//i.test(base64String)) return next();
      if (!base64String || String(base64String).trim() === '') return next();

      // Accept only data:image/* base64
      if (!/^data:image\/[\w+.-]+;base64,/i.test(base64String)) {
        return res.status(400).json({ success: false, message: 'Invalid base64 image string' });
      }

      const [, , data] = base64String.match(/^data:(image\/[\w+.-]+);base64,([\s\S]+)$/i) || [];
      if (!data) {
        return res.status(400).json({ success: false, message: 'Invalid base64 string' });
      }

      const buffer = Buffer.from(data.replace(/\s/g, ''), 'base64');

      // Clean previous user files (optional—kept from your original code)
      const existing = await fs.readdir(userFolder);
      await Promise.all(existing.map((file) => fs.unlink(path.join(userFolder, file)).catch(() => {})));

      const filename = `${Date.now()}_${randomUUID()}.webp`;
      const filePath = path.join(userFolder, filename);

      await sharp(buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 60 })
        .toFile(filePath);

      req.body.profile_pictures = toWebPath(filePath);
      return next();
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };
}

async function saveChatImage(base64String, chatFolder = 'uploads/chat_images') {
  if (!base64String || !/^data:image\/[\w+.-]+;base64,/i.test(base64String)) return null;

  const root = path.isAbsolute(chatFolder) ? chatFolder : path.join(process.cwd(), chatFolder);
  await ensureDir(root);

  const [, , data] = base64String.match(/^data:(image\/[\w+.-]+);base64,([\s\S]+)$/i) || [];
  if (!data) throw new Error('Invalid base64 image string');

  const buffer = Buffer.from(data.replace(/\s/g, ''), 'base64');
  const filename = `${Date.now()}_${randomUUID()}.webp`;
  const filePath = path.join(root, filename);

  await sharp(buffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 60 })
    .toFile(filePath);

  return toWebPath(filePath);
}

async function saveChatMedia(base64String, folder = 'uploads/chat_media') {
  if (!base64String || !/^data:[\w/+.-]+;base64,/i.test(base64String)) return null;

  const root = path.isAbsolute(folder) ? folder : path.join(process.cwd(), folder);
  await ensureDir(root);

  const [, mimeType, data] = base64String.match(/^data:([\w/+.-]+);base64,([\s\S]+)$/i) || [];
  if (!mimeType || !data) throw new Error('Invalid base64 media string');

  const buffer = Buffer.from(data.replace(/\s/g, ''), 'base64');

  let filename;
  let filePath;

  if (mimeType.toLowerCase().startsWith('image/')) {
    filename = `${Date.now()}_${randomUUID()}.webp`;
    filePath = path.join(root, filename);
    await sharp(buffer)
      .ensureAlpha()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 60 })
      .toFile(filePath);
  } else {
    // conservative ext extraction
    const ext = (mimeType.split('/')[1] || 'bin').replace(/[^a-z0-9.+-]/gi, '');
    filename = `${Date.now()}_${randomUUID()}.${ext}`;
    filePath = path.join(root, filename);
    await fs.writeFile(filePath, buffer);
  }

  return toWebPath(filePath);
}

module.exports = { handleBase64Upload, saveChatImage, saveChatMedia };
