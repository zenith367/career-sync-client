require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendTestEmail() {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "your-other-email@gmail.com",
      subject: "Test Email",
      text: "✅ Nodemailer test successful!",
    });
    console.log("Email sent successfully");
  } catch (err) {
    console.error("Email failed:", err.message);
  }
}

sendTestEmail();
