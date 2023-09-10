require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Return "https" URLs by setting secure: true
cloudinary.config({
  secure: true,
});

const app = express();
const PORT = process.env.PORT || 5000;

// Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // no larger than 5mb
  },
});

const generateUniqueFileName = (originalFileName) => {
  return `${new Date().getTime()}`;
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

  const { originalname, buffer, mimetype } = req.file;
  const fileName = generateUniqueFileName(originalname);

  if (
    mimetype.split("/")[0] !== "image" &&
    mimetype.split("/")[0] !== "video"
  ) {
    return res.status(400).json({ error: "File type not supported" });
  }

  try {
    const result = await cloudinary.uploader.upload_stream(
      {
        resource_type: mimetype.split("/")[0],
        public_id: fileName,
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.log(error);
          return res.status(500).json({ error });
        }
        res.status(200).json({ url: result.secure_url });
      }
    );

    await result.end(buffer);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
});

// Delete route /delete/:fileName
app.delete("/delete/:fileName", async (req, res) => {
  const { fileName } = req.params;

  if (!fileName) {
    return res.status(400).json({ error: "No file name provided" });
  }

  try {
    const result = await cloudinary.uploader.destroy(fileName, {
      resource_type: "image",
    });
    res.status(200).json({ result });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
