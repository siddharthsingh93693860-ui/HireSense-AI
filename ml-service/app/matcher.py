
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.skill_extractor import extract_skills


def calculate_similarity(resume_text, job_description):
    if not resume_text.strip() or not job_description.strip():
        return 0.0

    documents = [resume_text, job_description]

    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2)
    )

    try:
        vectors = vectorizer.fit_transform(documents)
    except ValueError:
        return 0.0

    score = cosine_similarity(
        vectors[0:1],
        vectors[1:2]
    )[0][0]

    return round(float(score) * 100, 2)


def analyze_match(
    resume_text,
    job_description,
    required_skills=None
):
    resume_skills = set(extract_skills(resume_text))
    job_skills = set(extract_skills(job_description))

    required = (
        set(required_skills)
        if required_skills is not None
        else job_skills
    )

    matched = sorted(resume_skills & required)
    missing = sorted(required - resume_skills)

    coverage = (
        round(len(matched) / len(required) * 100, 2)
        if required else None
    )

    return {
        "similarity_score": calculate_similarity(
            resume_text, job_description
        ),
        "resume_skills": sorted(resume_skills),
        "job_skills": sorted(job_skills),
        "matched_skills": matched,
        "missing_skills": missing,
        "skill_coverage": coverage
    }
