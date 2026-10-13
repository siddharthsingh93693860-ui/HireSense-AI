const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    storedName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["pdf", "docx"],
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "completed", "failed"],
      default: "uploaded",
    },
    extractedText: {
      type: String,
      default: "",
    },

    analysis: {
      similarityScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      skillCoverage: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
      resumeSkills: {
        type: [String],
        default: [],
      },
      jobSkills: {
        type: [String],
        default: [],
      },
      matchedSkills: {
        type: [String],
        default: [],
      },
      missingSkills: {
        type: [String],
        default: [],
      },
      jobDescription: {
        type: String,
        default: "",
      },
      analyzedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Resume", resumeSchema);
