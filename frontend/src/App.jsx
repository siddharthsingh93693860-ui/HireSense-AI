import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import api from "./services/api";

function readSavedData(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

const features = {
  "resume-analysis": {
    number: "01",
    title: "Resume Analysis",
    subtitle: "Understand your resume",
    description:
      "Review extracted resume details, technical skills, word count and important resume sections.",
  },
  "ats-score": {
    number: "02",
    title: "ATS Score",
    subtitle: "Check your job compatibility",
    description:
      "Review resume-to-job similarity after analyzing your resume against a job description.",
  },
  "job-matching": {
    number: "03",
    title: "Job Matching",
    subtitle: "Find your job match",
    description:
      "Compare your resume with a job description using the resume analysis service.",
  },
  "skill-gap": {
    number: "04",
    title: "Skill Gap Analysis",
    subtitle: "Discover skills to improve",
    description:
      "Identify skills found in the job description but missing from your resume.",
  },
};

function FeaturePage({ type }) {
  const navigate = useNavigate();
  const feature = features[type];

  const [resumeId, setResumeId] = useState(
    () => localStorage.getItem("hireSenseResumeId") || ""
  );

  const [resumeAnalysis, setResumeAnalysis] = useState(() =>
    readSavedData("hireSenseResumeAnalysis")
  );

  const [jobAnalysis, setJobAnalysis] = useState(() =>
    readSavedData("hireSenseAnalysis")
  );

  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Check login and reload saved analysis when opening a feature page.
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let active = true;

    async function loadData() {
      const savedResumeId =
        localStorage.getItem("hireSenseResumeId") || "";

      setResumeId(savedResumeId);
      setResumeAnalysis(readSavedData("hireSenseResumeAnalysis"));
      setJobAnalysis(readSavedData("hireSenseAnalysis"));

      if (!savedResumeId || type !== "resume-analysis") {
        return;
      }

      try {
        const response = await api.get(
          `/resumes/${savedResumeId}/analysis`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!active) return;

        const result = response.data.analysis || response.data;

        setResumeAnalysis(result);

        localStorage.setItem(
          "hireSenseResumeAnalysis",
          JSON.stringify(result)
        );
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load resume analysis."
          );
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [navigate, type]);

  async function handleJobMatch(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!resumeId) {
      setError("Please upload a resume from the Dashboard first.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        `/resumes/${resumeId}/analyze`,
        {
          jobDescription: jobDescription.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data.analysis || response.data;

      setJobAnalysis(result);

      localStorage.setItem(
        "hireSenseAnalysis",
        JSON.stringify(result)
      );

      setMessage("Job analysis completed successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Job analysis failed. Check your backend and ML service."
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("hireSenseResumeId");
    localStorage.removeItem("hireSenseResumeAnalysis");
    localStorage.removeItem("hireSenseAnalysis");

    navigate("/login", { replace: true });
  }

  if (!feature) {
    return <Navigate to="/dashboard" replace />;
  }

  // Support both camelCase backend results and Python snake_case results.
  const skills =
    resumeAnalysis?.skills ||
    resumeAnalysis?.resumeSkills ||
    [];

  const sections = resumeAnalysis?.detectedSections || [];

  const resumeSkills =
    jobAnalysis?.resumeSkills ||
    jobAnalysis?.resume_skills ||
    [];

  const jobSkills =
    jobAnalysis?.jobSkills ||
    jobAnalysis?.job_skills ||
    [];

  const matchedSkills =
    jobAnalysis?.matchedSkills ||
    jobAnalysis?.matched_skills ||
    [];

  const missingSkills =
    jobAnalysis?.missingSkills ||
    jobAnalysis?.missing_skills ||
    [];

  const similarity =
    jobAnalysis?.similarityScore ??
    jobAnalysis?.similarity_score;

  const coverage =
    jobAnalysis?.skillCoverage ??
    jobAnalysis?.skill_coverage;

  function formatPercent(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) return null;

    return `${Math.round(number > 1 ? number : number * 100)}%`;
  }

  const similarityPercent = formatPercent(similarity);
  const coveragePercent = formatPercent(coverage);

  const wordCount =
    resumeAnalysis?.wordCount ??
    resumeAnalysis?.word_count ??
    "—";

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xl font-bold text-violet-400"
          >
            HireSense AI
          </button>

          <button
            onClick={logout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Logout
          </button>
        </header>

        <main className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-10">
          <p className="text-center text-sm font-semibold tracking-widest text-violet-400">
            FEATURE {feature.number}
          </p>

          <h1 className="mt-3 text-center text-3xl font-bold">
            {feature.title}
          </h1>

          <h2 className="mt-3 text-center text-xl text-slate-300">
            {feature.subtitle}
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-center leading-7 text-slate-400">
            {feature.description}
          </p>

          {error && (
            <div className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-300">
              {message}
            </div>
          )}

          {!resumeId ? (
            <EmptyState
              text="No uploaded resume was found. Upload your resume from the Dashboard first."
              buttonText="Go to Dashboard"
              onClick={() => navigate("/dashboard")}
            />
          ) : (
            <>
              {/* FEATURE 01: Resume Analysis */}
              {type === "resume-analysis" && (
                <section className="mt-8 space-y-6">
                  <h3 className="text-xl font-semibold">
                    Your Resume Details
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Metric label="Word Count" value={wordCount} />
                    <Metric
                      label="Extracted Skills"
                      value={skills.length}
                    />
                    <Metric
                      label="Detected Sections"
                      value={sections.length}
                    />
                  </div>

                  <DataList
                    title="Extracted Resume Skills"
                    items={skills}
                  />

                  <DataList
                    title="Detected Resume Sections"
                    items={sections}
                  />

                  {!resumeAnalysis && (
                    <p className="text-slate-400">
                      Resume analysis is not available yet.
                    </p>
                  )}
                </section>
              )}

              {/* FEATURE 02: ATS Score */}
              {type === "ats-score" && (
                <section className="mt-8 space-y-6">
                  <h3 className="text-center text-xl font-semibold">
                    Resume-Job Similarity
                  </h3>

                  {similarityPercent !== null ? (
                    <>
                      <div className="rounded-xl bg-slate-950 p-6 text-center">
                        <p className="text-5xl font-bold text-violet-400">
                          {similarityPercent}
                        </p>

                        <p className="mt-3 text-slate-400">
                          NLP similarity between your resume and job
                          description
                        </p>

                        <div className="mx-auto mt-5 h-3 max-w-xl overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number(
                                    similarityPercent.replace("%", "")
                                  )
                                )
                              )}%`,
                            }}
                          />
                        </div>

                        {coveragePercent !== null && (
                          <p className="mt-5 text-slate-300">
                            Skill coverage: {coveragePercent}
                          </p>
                        )}
                      </div>

                      <DataList
                        title="Matched Skills"
                        items={matchedSkills}
                      />

                      <DataList
                        title="Missing Skills"
                        items={missingSkills}
                      />
                    </>
                  ) : (
                    <EmptyState
                      text="Run Job Matching first to generate your similarity result."
                      onClick={() =>
                        navigate("/dashboard/job-matching")
                      }
                      buttonText="Go to Job Matching"
                    />
                  )}

                  <p className="text-sm leading-6 text-slate-500">
                    This is an NLP-based similarity estimate, not an
                    official ATS score or a guarantee of selection.
                  </p>
                </section>
              )}

              {/* FEATURE 03: Job Matching */}
              {type === "job-matching" && (
                <section className="mt-8">
                  <h3 className="text-xl font-semibold">
                    Enter Job Description
                  </h3>

                  <form
                    onSubmit={handleJobMatch}
                    className="mt-4 space-y-4"
                  >
                    <textarea
                      value={jobDescription}
                      onChange={(event) =>
                        setJobDescription(event.target.value)
                      }
                      rows={8}
                      maxLength={100000}
                      required
                      placeholder="Paste the complete job description here..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 outline-none placeholder:text-slate-500 focus:border-violet-500"
                    />

                    <button
                      type="submit"
                      disabled={loading || !jobDescription.trim()}
                      className="rounded-lg bg-violet-600 px-6 py-3 font-semibold hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Analyzing..." : "Analyze Job Match"}
                    </button>
                  </form>

                  {jobAnalysis && (
                    <div className="mt-8 space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Metric
                          label="Resume-Job Similarity"
                          value={similarityPercent || "—"}
                        />

                        <Metric
                          label="Skill Coverage"
                          value={coveragePercent || "—"}
                        />
                      </div>

                      <DataList
                        title="Skills Detected in Resume"
                        items={resumeSkills}
                      />

                      <DataList
                        title="Skills Detected in Job"
                        items={jobSkills}
                      />

                      <DataList
                        title="Matched Skills"
                        items={matchedSkills}
                      />

                      <DataList
                        title="Missing Skills"
                        items={missingSkills}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* FEATURE 04: Skill Gap Analysis */}
              {type === "skill-gap" && (
                <section className="mt-8 space-y-6">
                  <h3 className="text-xl font-semibold">
                    Skills to Improve
                  </h3>

                  {jobAnalysis ? (
                    <>
                      <p className="text-slate-400">
                        Compare the skills detected in your resume with
                        the requirements found in the job description.
                      </p>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <Metric
                          label="Job Skills"
                          value={jobSkills.length}
                        />

                        <Metric
                          label="Matched Skills"
                          value={matchedSkills.length}
                        />

                        <Metric
                          label="Missing Skills"
                          value={missingSkills.length}
                        />
                      </div>

                      {missingSkills.length > 0 ? (
                        <div className="rounded-xl border border-amber-800 bg-amber-950/20 p-5">
                          <h4 className="font-semibold text-amber-300">
                            Skills to Learn
                          </h4>

                          <p className="mt-2 text-sm text-slate-400">
                            These skills were detected in the job
                            requirements but not in your resume.
                          </p>

                          <DataList
                            title="Missing Skills"
                            items={missingSkills}
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-5">
                          <h4 className="font-semibold text-emerald-300">
                            No Missing Skills Detected
                          </h4>

                          <p className="mt-2 text-sm text-slate-300">
                            The current analysis did not identify any
                            missing skills. Try a more detailed job
                            description if this seems unexpected.
                          </p>
                        </div>
                      )}

                      <DataList
                        title="Matched Skills — Already in Your Resume"
                        items={matchedSkills}
                      />

                      <DataList
                        title="All Skills Detected in Job Description"
                        items={jobSkills}
                      />

                      <DataList
                        title="All Skills Detected in Your Resume"
                        items={resumeSkills}
                      />

                      <button
                        onClick={() =>
                          navigate("/dashboard/job-matching")
                        }
                        className="rounded-lg bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-700"
                      >
                        Analyze Another Job
                      </button>
                    </>
                  ) : (
                    <EmptyState
                      text="No job analysis is saved yet. Run Job Matching first to calculate your skill gaps."
                      onClick={() =>
                        navigate("/dashboard/job-matching")
                      }
                      buttonText="Go to Job Matching"
                    />
                  )}
                </section>
              )}
            </>
          )}

          <div className="mt-10 text-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-lg bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-700"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 break-words text-2xl font-bold text-violet-400">
        {value}
      </p>
    </div>
  );
}

function DataList({ title, items }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div>
      <h4 className="font-semibold">{title}</h4>

      {safeItems.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {safeItems.map((item, index) => {
            const value =
              typeof item === "string"
                ? item
                : item?.name || item?.skill || String(item);

            return (
              <span
                key={`${value}-${index}`}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300"
              >
                {value}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          No skills returned by the analysis.
        </p>
      )}
    </div>
  );
}

function EmptyState({ text, buttonText, onClick }) {
  return (
    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-6 text-center">
      <p className="text-slate-400">{text}</p>

      <button
        onClick={onClick}
        className="mt-4 rounded-lg bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-700"
      >
        {buttonText}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/register" replace />}
        />

        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/dashboard/resume-analysis"
          element={<FeaturePage type="resume-analysis" />}
        />

        <Route
          path="/dashboard/ats-score"
          element={<FeaturePage type="ats-score" />}
        />

        <Route
          path="/dashboard/job-matching"
          element={<FeaturePage type="job-matching" />}
        />

        <Route
          path="/dashboard/skill-gap"
          element={<FeaturePage type="skill-gap" />}
        />

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
