const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const Resume = require("../model/resume");
const protect = require("../middleware/authMiddleware");
const { analyzeResume } = require("../services/mlservices");

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const router = express.Router();

// Resume upload directory
const uploadDir = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const allowed = {
      ".pdf": "application/pdf",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    if (!allowed[extension] || file.mimetype !== allowed[extension]) {
      return cb(new Error("Only PDF and DOCX files are allowed."));
    }

    cb(null, true);
  },
});

// Reusable upload error handler
function handleUpload(req, res, next) {
  upload.single("resume")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "File must be 5 MB or smaller."
            : err.message,
      });
    }

    next();
  });
}

// POST /resumes
// Upload resume and extract text
router.post("/", protect, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a resume file.",
      });
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    let extractedText = "";

    if (extension === ".pdf") {
      const pdfBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(pdfBuffer);
      extractedText = pdfData.text.trim();
    } else if (extension === ".docx") {
      const result = await mammoth.extractRawText({
        path: req.file.path,
      });

      extractedText = result.value.trim();
    }

    if (!extractedText) {
      fs.unlink(req.file.path, () => {});

      return res.status(422).json({
        message:
          "No readable text found. Please upload a text-based PDF or DOCX.",
      });
    }

    const resume = await Resume.create({
      user: req.user._id,
      originalName: path.basename(req.file.originalname),
      storedName: req.file.filename,
      fileType: extension === ".pdf" ? "pdf" : "docx",
      fileSize: req.file.size,
      extractedText,
    });

    return res.status(201).json({
      message: "Resume uploaded successfully!",
      resume: {
        id: resume._id,
        originalName: resume.originalName,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        status: resume.status,
      },
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    console.error("Resume upload error:", error.message);

    return res.status(500).json({
      message: "Resume upload failed.",
    });
  }
});

// GET /resumes/:id/analysis
// Basic resume analysis
router.get("/:id/analysis", protect, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select("-storedName");

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found.",
      });
    }

    const text = resume.extractedText || "";

    if (!text.trim()) {
      return res.status(422).json({
        message: "No extracted text available for analysis.",
      });
    }

    const skillList = [
      "C++",
      "Java",
      "Python",
      "JavaScript",
      "React",
      "Node.js",
      "Express",
      "MongoDB",
      "SQL",
      "HTML",
      "CSS",
      "Machine Learning",
      "Deep Learning",
      "Data Structures",
      "Git",
      "Docker",
      "AWS",
    ];

    const skills = skillList.filter((skill) => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      return regex.test(text);
    });

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    const sections = [
      "education",
      "experience",
      "projects",
      "skills",
      "certifications",
    ];

    const detectedSections = sections.filter((section) =>
      new RegExp(section, "i").test(text),
    );

    return res.json({
      message: "Resume analyzed successfully.",
      analysis: {
        resumeId: resume._id,
        originalName: resume.originalName,
        skills,
        wordCount,
        detectedSections,
        totalSkills: skills.length,
      },
    });
  } catch (error) {
    console.error("Resume analysis error:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid resume ID.",
      });
    }

    return res.status(500).json({
      message: "Resume analysis failed.",
    });
  }
});

// POST /resumes/:id/analyze
// Analyze resume against a job description using Python ML service
router.post("/:id/analyze", protect, async (req, res) => {
  try {
    const { jobDescription, requiredSkills } = req.body;

    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
      return res.status(400).json({
        message: "Please provide a job description.",
      });
    }

    if (jobDescription.length > 100000) {
      return res.status(400).json({
        message: "Job description must be 100,000 characters or fewer.",
      });
    }

    if (
      requiredSkills !== undefined &&
      (!Array.isArray(requiredSkills) ||
        !requiredSkills.every(
          (skill) => typeof skill === "string" && skill.trim().length > 0,
        ))
    ) {
      return res.status(400).json({
        message: "requiredSkills must be an array of non-empty strings.",
      });
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({
        message: "Resume not found.",
      });
    }

    if (!resume.extractedText?.trim()) {
      return res.status(422).json({
        message: "No extracted resume text available.",
      });
    }

    // Call the existing Python FastAPI service
    const result = await analyzeResume({
      resumeText: resume.extractedText,
      jobDescription: jobDescription.trim(),
      requiredSkills,
    });

    // Save results to MongoDB
    resume.analysis = {
      similarityScore: result.similarity_score,
      skillCoverage: result.skill_coverage,
      resumeSkills: result.resume_skills,
      jobSkills: result.job_skills,
      matchedSkills: result.matched_skills,
      missingSkills: result.missing_skills,
      jobDescription: jobDescription.trim(),
      analyzedAt: new Date(),
    };

    resume.status = "completed";
    await resume.save();

    return res.json({
      message: "Resume-job analysis completed successfully.",
      resumeId: resume._id,
      analysis: resume.analysis,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid resume ID.",
      });
    }

    if (error.response) {
      console.error(
        "ML service error:",
        error.response.status,
        error.response.data,
      );

      return res.status(502).json({
        message: "ML service analysis failed.",
      });
    }

    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNABORTED" ||
      error.cause?.code === "ECONNREFUSED"
    ) {
      return res.status(503).json({
        message: "Python ML service is unavailable.",
      });
    }

    console.error("Analysis error:", error.message);

    return res.status(500).json({
      message: "Resume analysis failed.",
    });
  }
});

module.exports = router;
