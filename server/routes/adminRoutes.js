const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { db, auth } = require("../services/firebase"); // Firestore + Firebase Admin Auth
require("dotenv").config();

// -----------------------------
// Email transporter
// -----------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// -----------------------------
// Generate random password
// -----------------------------
function generatePassword(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let pass = "";
  for (let i = 0; i < length; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

// -----------------------------
// Approve registration
// -----------------------------
router.post("/approve-registration", async (req, res) => {
  try {
    const { id, email, name, role } = req.body; // role = 'institution' | 'company'

    if (!id || !email || !role) {
      return res.status(400).json({ success: false, message: "Missing fields." });
    }

    // Generate temporary password
    const tempPassword = generatePassword();

    // Create Firebase Auth user
    const firebaseUser = await auth.createUser({
      email,
      password: tempPassword,
      displayName: name,
      emailVerified: true, // ✅ Mark email as verified immediately
    });

    // Update Firestore document in original collection
    const collectionName = role === "institution" ? "institutions" : "companies";
    await db.collection(collectionName).doc(id).update({
      status: "approved",
      approvedAt: new Date().toISOString(),
      password: tempPassword,
      firebaseUid: firebaseUser.uid,
    });

    // ✅ ALSO create user document in 'users' collection for login
    await db.collection("users").doc(firebaseUser.uid).set({
      uid: firebaseUser.uid,
      name,
      email,
      role,
      approved: true,
      createdAt: new Date().toISOString(),
    });

    // Send email with temporary password
    await transporter.sendMail({
      from: `"Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "✅ Registration Approved",
      text: `Hi ${name},\n\nYour registration has been approved!\n\nYou can log in using this temporary password:\n\nPassword: ${tempPassword}\n\nPlease change it after logging in.\n\nBest,\nAdmin Team`,
    });

    res.json({ success: true, message: "Approved and email sent." });
  } catch (error) {
    console.error("Approval error:", error);
    res.status(500).json({ success: false, message: "Server error.", error: error.message });
  }
});

// -----------------------------
// Delete registration
// -----------------------------
router.delete("/delete/:collectionName/:id", async (req, res) => {
  try {
    const { collectionName, id } = req.params;

    // Delete from Firestore
    await db.collection(collectionName).doc(id).delete();

    res.json({ success: true, message: "Deleted successfully." });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ success: false, message: "Server error.", error: error.message });
  }
});

module.exports = router;
