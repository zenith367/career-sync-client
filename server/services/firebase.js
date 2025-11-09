const path = require("path");
const admin = require("firebase-admin");
require("dotenv").config();

// Make the env path absolute relative to project root
const serviceAccountPath = path.resolve(
  __dirname,  // services folder
  "../",      // go up to server root
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH.replace(/^\.\/services\//, "")
);

console.log("Using Firebase service account at:", serviceAccountPath);

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized successfully");
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
