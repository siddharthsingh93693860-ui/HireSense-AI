
import json
import re
from pathlib import Path

DATA_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "skills.json"
)


def load_skills():
    with open(DATA_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def extract_skills(text: str) -> list[str]:
    if not text or not text.strip():
        return []

    text = text.lower()
    skill_data = load_skills()
    found = set()

    for skill, aliases in skill_data.items():
        for alias in set(aliases + [skill]):
            pattern = (
                r"(?<![a-zA-Z0-9])"
                + re.escape(alias.lower())
                + r"(?![a-zA-Z0-9])"
            )

            if re.search(pattern, text):
                found.add(skill)
                break

    return sorted(found)
