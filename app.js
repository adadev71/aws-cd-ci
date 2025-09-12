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

// Route for homepage
app.get("/", async (req, res) => {
  // fetch list of images from picsum
  const response = await fetch("https://picsum.photos/v2/list?page=1&limit=100");
  const images = await response.json();

  // pick random
  const random = images[Math.floor(Math.random() * images.length)];
  const imageUrl = `https://picsum.photos/id/${random.id}/400/400`;
    console.log("Random Image URL:", imageUrl); 
  res.render("index", { imageUrl });
});


app.post("/save", async (req, res) => {
  console.log("Form Data:Submiied ", req.body);
  debugger;
  const GCimageUrl = req.body.c_imageUrl;   // get from form
  if (!GCimageUrl) return res.send("No image to save!");
debugger;
  const response = await fetch(GCimageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const fileName = `picsum-${Date.now()}.jpg`;

  try {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: "image/jpeg",
      ACL: "public-read",
    }));

    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    res.send(`✅ Saved to S3: <a href="${publicUrl}" target="_blank">${publicUrl}</a><br><a href="/">Go Back</a>`);
  } catch (err) {
    console.error("S3 Upload Error:", err);
    res.status(500).send("❌ Error saving to S3: " + err.message);
  }
});




app.listen(3000, () => console.log("Server running on http://localhost:3000"));
