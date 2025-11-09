const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Career Guidance Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("📨 Email sent:", info.response);
    return info;
  } catch (err) {
    console.error("❌ Email send error:", err.message);
    throw new Error("Email sending failed");
  }
};

module.exports = { sendEmail };
