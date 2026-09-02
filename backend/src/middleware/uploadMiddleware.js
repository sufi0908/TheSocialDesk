const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadRoot = path.resolve(__dirname, '../../uploads');
const tempRoot = path.join(uploadRoot, '.tmp');
fs.mkdirSync(tempRoot, { recursive: true });

const FORBIDDEN_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.mjs', '.cjs',
  '.com', '.scr', '.msi', '.php', '.phtml', '.py', '.rb', '.jar', '.apk',
  '.bin', '.app', '.dll', '.so', '.dylib', '.cgi', '.pl', '.jsp', '.asp', '.aspx',
]);

const allowedTypes = {
  // Images
  '.jpg': { mime: 'image/jpeg', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.jpeg': { mime: 'image/jpeg', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.jfif': { mime: 'image/jpeg', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.png': { mime: 'image/png', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.webp': { mime: 'image/webp', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.gif': { mime: 'image/gif', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.svg': { mime: 'image/svg+xml', type: 'IMAGE', max: 10 * 1024 * 1024 },
  '.avif': { mime: 'image/avif', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.bmp': { mime: 'image/bmp', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.ico': { mime: 'image/x-icon', type: 'IMAGE', max: 10 * 1024 * 1024 },
  '.tiff': { mime: 'image/tiff', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.tif': { mime: 'image/tiff', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.heic': { mime: 'image/heic', type: 'IMAGE', max: 25 * 1024 * 1024 },
  '.heif': { mime: 'image/heif', type: 'IMAGE', max: 25 * 1024 * 1024 },

  // Videos
  '.mp4': { mime: 'video/mp4', type: 'VIDEO', max: 250 * 1024 * 1024 },
  '.webm': { mime: 'video/webm', type: 'VIDEO', max: 250 * 1024 * 1024 },
  '.mov': { mime: 'video/quicktime', type: 'VIDEO', max: 250 * 1024 * 1024 },
  '.mkv': { mime: 'video/x-matroska', type: 'VIDEO', max: 250 * 1024 * 1024 },
  '.avi': { mime: 'video/x-msvideo', type: 'VIDEO', max: 250 * 1024 * 1024 },
  '.m4v': { mime: 'video/x-m4v', type: 'VIDEO', max: 250 * 1024 * 1024 },
  '.wmv': { mime: 'video/x-ms-wmv', type: 'VIDEO', max: 250 * 1024 * 1024 },

  // Audio / Voice Notes
  '.mp3': { mime: 'audio/mpeg', type: 'VOICE_NOTE', max: 50 * 1024 * 1024 },
  '.wav': { mime: 'audio/wav', type: 'VOICE_NOTE', max: 50 * 1024 * 1024 },
  '.ogg': { mime: 'audio/ogg', type: 'VOICE_NOTE', max: 50 * 1024 * 1024 },
  '.m4a': { mime: 'audio/m4a', type: 'VOICE_NOTE', max: 50 * 1024 * 1024 },
  '.aac': { mime: 'audio/aac', type: 'VOICE_NOTE', max: 50 * 1024 * 1024 },
  '.flac': { mime: 'audio/flac', type: 'VOICE_NOTE', max: 50 * 1024 * 1024 },
  '.opus': { mime: 'audio/opus', type: 'VOICE_NOTE', max: 50 * 1024 * 1024 },

  // Documents
  '.pdf': { mime: 'application/pdf', type: 'DOCUMENT', max: 50 * 1024 * 1024 },
  '.doc': { mime: 'application/msword', type: 'DOCUMENT', max: 50 * 1024 * 1024 },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', type: 'DOCUMENT', max: 50 * 1024 * 1024 },
  '.xls': { mime: 'application/vnd.ms-excel', type: 'DOCUMENT', max: 50 * 1024 * 1024 },
  '.xlsx': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', type: 'DOCUMENT', max: 50 * 1024 * 1024 },
  '.ppt': { mime: 'application/vnd.ms-powerpoint', type: 'DOCUMENT', max: 50 * 1024 * 1024 },
  '.pptx': { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', type: 'DOCUMENT', max: 50 * 1024 * 1024 },
  '.txt': { mime: 'text/plain', type: 'DOCUMENT', max: 20 * 1024 * 1024 },
  '.csv': { mime: 'text/csv', type: 'DOCUMENT', max: 20 * 1024 * 1024 },
  '.zip': { mime: 'application/zip', type: 'DOCUMENT', max: 100 * 1024 * 1024 },
  '.rar': { mime: 'application/x-rar-compressed', type: 'DOCUMENT', max: 100 * 1024 * 1024 },
  '.7z': { mime: 'application/x-7z-compressed', type: 'DOCUMENT', max: 100 * 1024 * 1024 },
  '.json': { mime: 'application/json', type: 'DOCUMENT', max: 20 * 1024 * 1024 },
};

function resolveFileDefinition(filename, mimetype) {
  const extension = path.extname(filename || '').toLowerCase();
  if (allowedTypes[extension]) {
    return allowedTypes[extension];
  }

  const mime = String(mimetype || '').toLowerCase();
  if (mime.startsWith('image/')) {
    return { mime, type: 'IMAGE', max: 25 * 1024 * 1024 };
  }
  if (mime.startsWith('video/')) {
    return { mime, type: 'VIDEO', max: 250 * 1024 * 1024 };
  }
  if (mime.startsWith('audio/')) {
    return { mime, type: 'VOICE_NOTE', max: 50 * 1024 * 1024 };
  }
  if (mime.startsWith('text/') || mime === 'application/pdf' || mime.includes('document') || mime.includes('sheet') || mime.includes('presentation') || mime.includes('zip')) {
    return { mime, type: 'DOCUMENT', max: 50 * 1024 * 1024 };
  }

  return { mime: mime || 'application/octet-stream', type: 'OTHER', max: 50 * 1024 * 1024 };
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, tempRoot),
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${ext}.upload`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      const error = new Error(`File type ${extension} is not permitted for security reasons.`);
      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

async function validateFileSignature(file) {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const header = Buffer.alloc(16);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const bytes = header.subarray(0, bytesRead);
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension === '.jpg' || extension === '.jpeg' || extension === '.jfif') {
      if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) {
        throw new Error('Uploaded image content does not match JPEG header signature.');
      }
    } else if (extension === '.png') {
      if (!bytes.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        throw new Error('Uploaded image content does not match PNG header signature.');
      }
    } else if (extension === '.gif') {
      const headerStr = bytes.subarray(0, 6).toString('ascii');
      if (headerStr !== 'GIF87a' && headerStr !== 'GIF89a') {
        throw new Error('Uploaded image content does not match GIF header signature.');
      }
    } else if (extension === '.webp') {
      if (!(bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP')) {
        throw new Error('Uploaded image content does not match WEBP header signature.');
      }
    } else if (extension === '.pdf') {
      if (bytes.subarray(0, 5).toString() !== '%PDF-') {
        throw new Error('Uploaded document does not match PDF header signature.');
      }
    } else if (extension === '.svg') {
      const content = await fs.promises.readFile(file.path, { encoding: 'utf8' });
      if (!content.slice(0, 4096).includes('<svg') || /<script|javascript:/i.test(content)) {
        throw new Error('Uploaded SVG is invalid or contains forbidden executable elements.');
      }
    }
  } finally {
    await handle.close();
  }
}

function cleanupUploadedFile(file) {
  if (file?.path) return fs.promises.unlink(file.path).catch(() => undefined);
  return Promise.resolve();
}

function cleanupUploadedFiles(files) {
  if (Array.isArray(files)) {
    return Promise.all(files.map((f) => cleanupUploadedFile(f)));
  }
  return cleanupUploadedFile(files);
}

module.exports = {
  upload,
  allowedTypes,
  resolveFileDefinition,
  uploadRoot,
  FORBIDDEN_EXTENSIONS,
  validateFileSignature,
  cleanupUploadedFile,
  cleanupUploadedFiles,
};