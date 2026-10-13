
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.matcher import analyze_match

app = FastAPI(
    title="HireSense AI",
    description="AI Resume Analyzer and Job Matcher",
    version="1.0.0"
)


class AnalyzeRequest(BaseModel):
    resume_text: str = Field(min_length=1, max_length=200_000)
    job_description: str = Field(min_length=1, max_length=100_000)
    required_skills: list[str] | None = None


@app.get("/")
def home():
    return {"message": "HireSense AI ML Service is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/analyze")
def analyze_resume(request: AnalyzeRequest):
    if not request.resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Resume text cannot be empty"
        )

    if not request.job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Job description cannot be empty"
        )

    return analyze_match(
        resume_text=request.resume_text,
        job_description=request.job_description,
        required_skills=request.required_skills
    )
