import api from "./api";

export const analyzeResume = async (
  resumeId,
  jobDescription,
  requiredSkills,
) => {
  const response = await api.post(`/resumes/${resumeId}/analyze`, {
    jobDescription,
    requiredSkills,
  });

  return response.data;
};

