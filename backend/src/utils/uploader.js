// src/utils/uploader.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Base uploads directory
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Optional: subdirectory for complaint images
const complaintDir = path.join(uploadsDir, 'complaints');
if (!fs.existsSync(complaintDir)) {
  fs.mkdirSync(complaintDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // For now we put everything in /uploads/complaints
    cb(null, complaintDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only jpg, jpeg, png files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
