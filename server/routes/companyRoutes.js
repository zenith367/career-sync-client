// routes/company.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/*
---------------------------------------------------------
UTIL — QUALIFICATION ENGINE
---------------------------------------------------------
*/
function calculateFinalScore(data) {
  const academic = Number(data.academicScore || 0);
  const certs = Array.isArray(data.certificates) ? data.certificates.length * 5 : 0;
  const work = Number(data.workExperience || 0) * 2;
  const relevance = Number(data.relevanceScore || 0);

  return academic + certs + work + relevance;
}

/*
---------------------------------------------------------
POST /company/postJob
Creates job + auto-creates subcollection + notifies students
---------------------------------------------------------
*/
router.post("/postJob", async (req, res) => {
  try {
    const {
      companyId,
      title,
      role,
      location,
      requirements,
      preferredSkills,
      deadline
    } = req.body;

    if (!companyId || !title || !role || !location) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const jobRef = db.collection("companies").doc(companyId).collection("jobs").doc();
    const jobData = {
      jobId: jobRef.id,
      title,
      role,
      location,
      requirements,
      preferredSkills,
      deadline,
      createdAt: new Date().toISOString()
    };

    await jobRef.set(jobData);

    // notify students (creates job feed)
    const students = await db.collection("students").get();
    for (const s of students.docs) {
      await db.collection("students")
        .doc(s.id)
        .collection("jobFeed")
        .doc(jobRef.id)
        .set(jobData);
    }

    return res.json({ success: true, job: jobData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/*
---------------------------------------------------------
GET /company/jobs/:companyId
Return all jobs under this company
---------------------------------------------------------
*/
router.get("/jobs/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const snap = await db.collection("companies").doc(companyId).collection("jobs").get();

    const jobs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(jobs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/*
---------------------------------------------------------
POST /student/apply
Writes to: 
1. companies/{companyId}/applicants
2. students/{studentId}/applications
---------------------------------------------------------
*/
router.post("/student/apply", async (req, res) => {
  try {
    const {
      studentId,
      companyId,
      jobId,
      academicScore,
      certificates,
      workExperience,
      relevanceScore
    } = req.body;

    if (!studentId || !companyId || !jobId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const finalScore = calculateFinalScore({
      academicScore,
      certificates,
      workExperience,
      relevanceScore
    });

    const qualified = finalScore >= 60 ? "qualified" : "not_qualified";

    const appData = {
      studentId,
      jobId,
      academicScore,
      certificates,
      workExperience,
      relevanceScore,
      finalScore,
      status: qualified,
      createdAt: new Date().toISOString()
    };

    // write to company applicants
    const appRef = db.collection("companies").doc(companyId).collection("applicants").doc();
    await appRef.set(appData);

    // write to student profile
    await db.collection("students").doc(studentId)
      .collection("applications")
      .doc(appRef.id)
      .set(appData);

    return res.json({ success: true, qualified, finalScore });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/*
---------------------------------------------------------
GET /company/applicants/:companyId
Returns ONLY qualified applicants
---------------------------------------------------------
*/
router.get("/applicants/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;

    const snap = await db
      .collection("companies")
      .doc(companyId)
      .collection("applicants")
      .orderBy("finalScore", "desc")
      .get();

    const applicants = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(a => a.status === "qualified"); // filter

    return res.json(applicants);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/*
---------------------------------------------------------
POST /company/updateProfile
---------------------------------------------------------
*/
router.post("/updateProfile", async (req, res) => {
  try {
    const { companyId, name, email, location } = req.body;

    if (!companyId) return res.status(400).json({ error: "companyId missing" });

    await db.collection("companies").doc(companyId).set(
      {
        name: name || null,
        email: email || null,
        location: location || null,
        profileComplete: true,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
