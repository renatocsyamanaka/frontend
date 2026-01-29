const path = require('path');
const fs = require('fs');
const multer = require('multer');

function storageFactory(subdir) {
  const dir = path.resolve(__dirname, '..', '..', 'uploads', subdir);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const name = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    },
  });
}

const uploadAvatar = multer({ storage: storageFactory('avatars') });
// >>> NOVO
const uploadNews = multer({ storage: storageFactory('news') });

module.exports = { uploadAvatar, uploadNews };
