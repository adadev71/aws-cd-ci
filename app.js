const express = require("express");
const bodyParser = require("body-parser");
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
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

app.get("/list", async (req, res) => {
  try {
    const data = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
    }));

    if (!data.Contents || data.Contents.length === 0) {
      return res.send("📂 No images found in bucket.");
    }

    const images = data.Contents.map(obj => {
      return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`;
    });

    // Simple HTML page
let html = "<h2>📸 Saved Images</h2>";
html += images.map(url => {
  const key = url.split("/").pop(); // get filename
  return `
    <div style="margin:10px">
      <img src="${url}" width="200"><br>
      <a href="${url}" target="_blank">${key}</a> 
    </div>
  `;
}).join("");
html += `<br><a href="/">⬅️ Back to Home</a>`;

    res.send(html);
  } catch (err) {
    console.error("S3 List Error:", err);
    res.status(500).send("❌ Error fetching images: " + err.message);
  }
});




app.listen(3000, () => console.log("Server running on http://localhost:3000"));
