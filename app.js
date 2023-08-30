const express = require("express");
const multer = require("multer");
const admin = require("firebase-admin");
const { getApps } = require("firebase-admin/app");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Firebase Admin SDK
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY.replace(
  /\\n/g,
  "\n"
);
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_STORAGE_BUCKET_URL = process.env.FIREBASE_STORAGE_BUCKET;

if (!getApps().length)
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      privateKey: FIREBASE_PRIVATE_KEY,
      clientEmail: FIREBASE_CLIENT_EMAIL,
    }),
    storageBucket: FIREBASE_STORAGE_BUCKET_URL,
  });

// Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb
  },
});

const generateUniqueFileName = (originalFileName) => {
  const arr = originalFileName.split(".");
  const extension = arr[arr.length - 1];
  return `${new Date().getTime()}.${extension}`;
};

app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const bucket = admin.storage().bucket();
  const blob = bucket.file(generateUniqueFileName(req.file.originalname));

  const blobWriter = blob.createWriteStream({
    metadata: {
      contentType: req.file.mimetype,
      public: true,
    },
  });

  blobWriter.on("error", (err) => {
    console.log(err);
    res.status(500).json({ error: err });
  });

  blobWriter.on("finish", async () => {
    const publicUrl = await blob.getSignedUrl({
      action: "read",
      expires: "03-09-2491",
    });
    res.status(200).json({ url: publicUrl[0] });
  });

  blobWriter.end(req.file.buffer);
});

// Delete route /delete/:fileName
app.delete("/delete/:fileName", async (req, res) => {
  const { fileName } = req.params;

  if (!fileName) {
    return res.status(400).json({ error: "No file name provided" });
  }

  const bucket = admin.storage().bucket();
  const blob = bucket.file(fileName);

  try {
    await blob.delete();
    res.status(200).json({ message: "File deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
