const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

async function analyzeResume({ resumeText, jobDescription, requiredSkills }) {
  const response = await axios.post(
    `${ML_SERVICE_URL}/analyze`,
    {
      resume_text: resumeText,
      job_description: jobDescription,
      ...(requiredSkills !== undefined
        ? { required_skills: requiredSkills }
        : {}),
    },
    {
      timeout: 30000,
    },
  );

  return response.data;
}

module.exports = { analyzeResume };
