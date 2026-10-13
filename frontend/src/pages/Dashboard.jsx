
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const features = [
  {
    number: "01",
    title: "Resume Analysis",
    description: "View extracted skills and resume details.",
    path: "/dashboard/resume-analysis",
  },
  {
    number: "02",
    title: "ATS Score",
    description: "Review your resume-to-job similarity.",
    path: "/dashboard/ats-score",
  },
  {
    number: "03",
    title: "Job Matching",
    description: "Compare your resume with a job description.",
    path: "/dashboard/job-matching",
  },
  {
    number: "04",
    title: "Skill Gap Analysis",
    description: "Identify skills missing for your target job.",
    path: "/dashboard/skill-gap",
  },
];

function readSavedData(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);

  // Hooks must be declared inside the component.
  const [resumeId, setResumeId] = useState(
    () => localStorage.getItem("hireSenseResumeId") || ""
  );

  const [resumeAnalysis, setResumeAnalysis] = useState(() =>
    readSavedData("hireSenseResumeAnalysis")
  );

  const [analysis, setAnalysis] = useState(() =>
    readSavedData("hireSenseAnalysis")
  );

  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Verify login and load the user profile.
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let active = true;

    async function loadUser() {
      try {
        const response = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (active) {
          setUser(response.data.user || response.data);
        }
      } catch (err) {
        if (!active) return;

        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login", { replace: true });
        } else {
          setError("Could not load your profile. Please refresh the page.");
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [navigate]);

  // Validate the selected file.
  function handleFileChange(event) {
    const selected = event.target.files?.[0];

    setFile(null);
    setError("");
    setMessage("");

    if (!selected) return;

    const extension = selected.name
      .slice(selected.name.lastIndexOf("."))
      .toLowerCase();

    if (![".pdf", ".docx"].includes(extension)) {
      setError("Please select a PDF or DOCX file.");
      event.target.value = "";
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setError("File size must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFile(selected);
  }

  // Upload resume and fetch its basic analysis.
  async function handleUpload(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!file) {
      setError("Please select a resume first.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await api.post("/resumes", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const uploadedResume =
        response.data.resume ||
        response.data.data?.resume ||
        response.data;

      const id =
        uploadedResume.id ||
        uploadedResume._id ||
        response.data.resumeId;

      if (!id) {
        throw new Error(
          "Upload response did not contain a resume ID."
        );
      }

      const savedId = String(id);

      setResumeId(savedId);
      localStorage.setItem("hireSenseResumeId", savedId);

      // Clear previous resume results.
      setResumeAnalysis(null);
      setAnalysis(null);

      localStorage.removeItem("hireSenseResumeAnalysis");
      localStorage.removeItem("hireSenseAnalysis");

      setFile(null);
      event.target.reset();

      setMessage("Resume uploaded. Loading analysis...");

      try {
        const details = await api.get(
          `/resumes/${savedId}/analysis`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = details.data.analysis || details.data;

        setResumeAnalysis(result);

        localStorage.setItem(
          "hireSenseResumeAnalysis",
          JSON.stringify(result)
        );

        setMessage("Resume uploaded and analysis loaded successfully.");
      } catch (analysisError) {
        console.error(
          "Resume analysis error:",
          analysisError.response?.data || analysisError.message
        );

        setMessage(
          "Resume uploaded, but its analysis could not be loaded."
        );
      }
    } catch (err) {
      console.error(
        "Resume upload error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message ||
          err.message ||
          "Resume upload failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // Match the uploaded resume against a job description.
  async function handleAnalyze(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!resumeId) {
      setError("Please upload your resume first.");
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

    setAnalyzing(true);

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

      setAnalysis(result);

      localStorage.setItem(
        "hireSenseAnalysis",
        JSON.stringify(result)
      );

      setMessage("Job matching completed successfully.");
    } catch (err) {
      console.error(
        "Job matching error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message ||
          "Job matching failed. Check your backend and ML service."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("hireSenseResumeId");
    localStorage.removeItem("hireSenseResumeAnalysis");
    localStorage.removeItem("hireSenseAnalysis");

    navigate("/login", { replace: true });
  }

  const skills =
    resumeAnalysis?.skills ||
    resumeAnalysis?.resumeSkills ||
    [];

  const sections = resumeAnalysis?.detectedSections || [];

  const matchedSkills = analysis?.matchedSkills || [];
  const missingSkills = analysis?.missingSkills || [];

  const wordCount =
    resumeAnalysis?.wordCount ??
    resumeAnalysis?.word_count ??
    "—";

  const similarity =
    analysis?.similarityScore ??
    analysis?.similarity_score;

  const coverage =
    analysis?.skillCoverage ??
    analysis?.skill_coverage;

  function formatPercent(value) {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) return "—";

    return `${Math.round(number > 1 ? number : number * 100)}%`;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            HireSense <span className="text-indigo-400">AI</span>
          </h1>

          <p className="mt-2 text-slate-400">
            Your AI-powered career workspace
          </p>
        </div>

        <button
          onClick={logout}
          className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
        >
          Logout
        </button>
      </header>

      <main className="mx-auto mt-10 max-w-6xl space-y-8">
        <section className="text-center">
          <p className="text-sm text-indigo-300">YOUR DASHBOARD</p>

          <h2 className="mt-2 text-3xl font-bold">
            Welcome{user?.name ? `, ${user.name}` : ""}!
          </h2>

          <p className="mt-3 text-slate-400">
            Upload your resume to get started with your career analysis.
          </p>
        </section>

        {message && (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Resume upload */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-semibold">Resume Analyzer</h3>

          <p className="mt-2 text-sm text-slate-400">
            Upload a PDF or DOCX resume. Maximum file size: 5 MB.
          </p>

          <form onSubmit={handleUpload} className="mt-6 space-y-4">
            <input
              type="file"
              name="resume"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="block w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-700 file:px-4 file:py-2 file:text-white"
            />

            {file && (
              <p className="break-all rounded-lg bg-slate-800 p-3 text-sm">
                Selected: {file.name}
              </p>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="rounded-lg bg-indigo-700 px-6 py-3 font-semibold hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload Resume"}
            </button>
          </form>

          {resumeId && (
            <p className="mt-4 break-all text-sm text-emerald-300">
              Resume uploaded. ID: {resumeId}
            </p>
          )}
        </section>

        {/* Feature cards */}
        <section>
          <h3 className="mb-5 text-xl font-semibold">
            Your Career Toolkit
          </h3>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <button
                key={feature.path}
                onClick={() => navigate(feature.path)}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:-translate-y-1 hover:border-indigo-500"
              >
                <span className="text-sm font-bold text-indigo-400">
                  {feature.number}
                </span>

                <h4 className="mt-3 text-lg font-semibold">
                  {feature.title}
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {feature.description}
                </p>

                <span className="mt-4 inline-block text-sm font-semibold text-indigo-400">
                  Explore →
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Basic resume analysis
        {resumeAnalysis && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold">
              Resume Analysis Results
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <Metric label="Word Count" value={wordCount} />
              <Metric label="Detected Skills" value={skills.length} />
              <Metric label="Detected Sections" value={sections.length} />
            </div>

            <DataList title="Extracted Skills" items={skills} />

            <div className="mt-6">
              <DataList title="Detected Sections" items={sections} />
            </div>
          </section>
        )} */}

        {/* Job matching */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-semibold">
            Match Resume With a Job
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            Paste a job description to compare skills and identify gaps.
          </p>

          <form onSubmit={handleAnalyze} className="mt-5 space-y-4">
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={7}
              placeholder="Paste the job description here..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
            />

            <button
              type="submit"
              disabled={!resumeId || analyzing}
              className="rounded-lg bg-indigo-700 px-6 py-3 font-semibold hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? "Analyzing..." : "Analyze Job Match"}
            </button>

            {!resumeId && (
              <p className="text-sm text-amber-300">
                Upload a resume before starting job matching.
              </p>
            )}
          </form>
        </section>

        {/* Job matching results */}
        {analysis && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold">
              Job Matching Results
            </h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Metric
                label="Resume-Job Similarity"
                value={formatPercent(similarity)}
              />

              <Metric
                label="Skill Coverage"
                value={formatPercent(coverage)}
              />
            </div>

            <div className="mt-6">
              <DataList title="Matched Skills" items={matchedSkills} />
            </div>

            <div className="mt-6">
              <DataList title="Missing Skills" items={missingSkills} />
            </div>

            <p className="mt-6 text-xs leading-5 text-slate-500">
              Similarity is an NLP-based comparison, not an official ATS
              score or a guarantee of selection.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-bold text-indigo-400">{value}</p>
    </div>
  );
}

function DataList({ title, items }) {
  const list = Array.isArray(items) ? items : [];

  return (
    <div className="mt-6">
      <h4 className="font-semibold">{title}</h4>

      {list.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {list.map((item, index) => {
            const value =
              typeof item === "string"
                ? item
                : item?.name || item?.skill || String(item);

            return (
              <span
                key={`${value}-${index}`}
                className="rounded-full border border-indigo-900 bg-indigo-950/50 px-3 py-1 text-sm text-indigo-300"
              >
                {value}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          No data available yet.
        </p>
      )}
    </div>
  );
}
