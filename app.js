const express = require("express");
const bodyParser = require("body-parser");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

// No need to import node-fetch! Node 18+ has fetch built-in


const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// AWS SDK v3 S3 client
const s3 = new S3Client({
   region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

let lastImageUrl = "";

app.get("/", (req, res) => {
  lastImageUrl = `https://picsum.photos/400/400?random=${Date.now()}`;
  res.render("index", { imageUrl: lastImageUrl });
});

app.post("/save", async (req, res) => {
  if (!lastImageUrl) return res.send("No image to save!");

  const response = await fetch(lastImageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const fileName = `picsum-${Date.now()}.jpg`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: "image/jpeg",
      ACL: "public-read",  // allows public access
    }));

    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    res.send(`✅ Saved to S3: <a href="${publicUrl}" target="_blank">${publicUrl}</a><br><a href="/">Go Back</a>    `);
  } catch (err) {
    console.error("S3 Upload Error:", err);
    res.status(500).send("❌ Error saving to S3: " + err.message);
  }
});



app.listen(3000, () => console.log("Server running on http://localhost:3000"));
