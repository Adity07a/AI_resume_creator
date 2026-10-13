import json

from app.services.llm_service import generate_json


SYSTEM_PROMPT = """
You are an expert resume writer and ATS resume optimization assistant.

Your task is to tailor a candidate's existing resume to a target job description.

STRICT RULES:
1. Never invent skills, qualifications, degrees, certifications, companies,
   job titles, employment dates, achievements, metrics, or project experience.
2. Use only information supported by the candidate's source resume.
3. Do not claim the candidate has a skill merely because it appears in the
   job description.
4. You may reorganize, clarify, and improve the wording of existing content.
5. Preserve the original facts, names, dates, and technical details.
6. Keep the resume professional, concise, and ATS-friendly.
7. If information is missing, use an empty string or empty list.
8. Return only one valid JSON object. Do not include Markdown fences or commentary.
9. Use the exact output structure requested by the user prompt.
"""

RESUME_SCHEMA={
    "personal_info":{
        "full_name":"",
        "email":"",
        "phone":"",
        "location":"",
        "linkedin":"",
        "github":"",
        "portfolio":"",

    },
    "summary":"",
    "skills":[],
    "experience":[
        {
            "job_title":"",
            "company":"",
            "location":"",
            "start_date":"",
            "end_date":"",
            "responsibilities":[],
        }
    ],
    "projects":[
        {
            "name":"",
            "description":"",
            "technologies":[],
        }
    ],
    "education":[
        {
            "degree":"",
            "institution":"",
            "location":"",
            "start_date":"",
            "end_date":"",
            "grade":"",
        }
    ],
    "certifications":[],
    "achievements":[],
    "languages":[],
    "links":[],
}

async def generate_resume(
        candidate_resume:dict,
        job_description:str,
        target_job_title:str="",
        target_company:str="",
 )-> dict:
    """Genrate an ATS-friendly resume using verified candidate information."""
    if not isinstance(candidate_resume,dict):
        raise ValueError("Candidate resume must be a JSON Object")
    if not job_description or not job_description.strip():
        raise ValueError("Job description cannot be empty.")
    candidate_json=json.dumps(
        candidate_resume,
        ensure_ascii=False,
        indent=2,
    )

    prompt = f"""
Create a tailored resume using the candidate's source information
and the target job details.

TARGET JOB TITLE:
{target_job_title or "Not provided"}

TARGET COMPANY:
{target_company or "Not provided"}

JOB DESCRIPTION:
<job_description>
{job_description}
</job_description>

CANDIDATE'S SOURCE RESUME (the source of truth):
<candidate_resume>
{candidate_json}
</candidate_resume>

REQUIREMENTS:
- Return a JSON object with exactly these top-level keys:
  personal_info, summary, skills, experience, projects, education,
  certifications, achievements, languages, links.
- Follow this output structure:
{json.dumps(RESUME_SCHEMA, ensure_ascii=False, indent=2)}
- The structure above shows the required fields and data types. Include
  all actual candidate entries, not just the example entries.
- Keep each experience entry's job_title, company, location, and dates
  consistent with the source resume.
- Tailor the summary and rewrite responsibilities only when supported
  by the candidate's actual experience.
- Prioritize relevant existing skills and project technologies.
- Do not add job-description keywords to skills unless the candidate's
  source resume supports those skills.
- Keep courses and certifications in certifications, not education.
- Keep formal degrees and school qualifications in education.
- Preserve LinkedIn, GitHub, and portfolio URLs exactly as provided.
- Do not create fake metrics or claim achievements that are not supported.
- If a section has no source information, return an empty list or string.
- Return only valid JSON, without Markdown fences.
"""

    return await generate_json(
        prompt=prompt,
        system_prompt=SYSTEM_PROMPT,
        temperature=0.1,
     )






async def improve_resume_section(
    section_name: str,
    section_content: str,
    job_description: str = "",
    target_job_title: str = "",
) -> dict:
    """Improve one resume section without inventing candidate information."""

    if not section_name.strip():
        raise ValueError("Section name cannot be empty.")

    if not section_content.strip():
        raise ValueError("Section content cannot be empty.")

    prompt = f"""
Improve the following resume section for clarity, professionalism,
readability, and relevance to the target job.

SECTION NAME:
{section_name}

CURRENT SECTION CONTENT:
<section_content>
{section_content}
</section_content>

TARGET JOB TITLE:
{target_job_title or "Not provided"}

JOB DESCRIPTION:
<job_description>
{job_description or "Not provided"}
</job_description>

Rules:
- Preserve the candidate's actual facts and meaning.
- Never invent skills, responsibilities, metrics, achievements,
  qualifications, or experience.
- Do not add keywords from the job description unless supported
  by the original section content.
- Keep the result concise and ATS-friendly.
- For experience or project descriptions, use clear action-oriented
  wording when supported by the original content.
- Return only a valid JSON object in this format:
  {{
    "section_name": "{section_name}",
    "improved_content": "Improved text here",
    "changes_summary": "Brief explanation of the changes"
  }}
"""

    from app.services.llm_service import generate_json

    result = await generate_json(
        prompt=prompt,
        system_prompt=(
            "You are a careful resume editor. Improve wording without "
            "inventing or exaggerating the candidate's qualifications."
        ),
        temperature=0.1,
    )

    improved_content = result.get("improved_content")

    if not isinstance(improved_content, str) or not improved_content.strip():
        raise RuntimeError("The AI did not return improved section content.")

    return {
        "section_name": section_name,
        "improved_content": improved_content.strip(),
        "changes_summary": str(result.get("changes_summary", "")),
    }


async def generate_resume_summary(
    candidate_resume: dict,
    target_job_title: str = "",
    job_description: str = "",
) -> dict:
    """Generate a truthful, job-targeted professional summary."""

    import json

    from app.services.llm_service import generate_json

    if not isinstance(candidate_resume, dict):
        raise ValueError("Candidate resume must be a JSON object.")

    if not candidate_resume:
        raise ValueError("Candidate resume cannot be empty.")

    candidate_json = json.dumps(
        candidate_resume,
        ensure_ascii=False,
        indent=2,
    )

    prompt = f"""
Write a concise, professional resume summary based only on the
candidate's source resume.

TARGET JOB TITLE:
{target_job_title or "Not provided"}

JOB DESCRIPTION:
<job_description>
{job_description or "Not provided"}
</job_description>

CANDIDATE SOURCE RESUME:
<candidate_resume>
{candidate_json}
</candidate_resume>

Rules:
- Write 2 to 4 sentences.
- Highlight relevant existing skills, experience, and projects.
- Tailor the wording to the target job when supported by the source.
- Never invent years of experience, skills, qualifications, metrics,
  employment history, or achievements.
- Do not claim expertise in a technology merely because it appears
  in the job description.
- If the candidate is a fresher, do not imply extensive professional
  experience.
- Return only a valid JSON object in this format:
  {{
    "summary": "The generated professional summary"
  }}
"""

    result = await generate_json(
        prompt=prompt,
        system_prompt=(
            "You are a professional resume writer. Write concise, "
            "ATS-friendly summaries while preserving factual accuracy."
        ),
        temperature=0.1,
    )

    summary = result.get("summary")

    if not isinstance(summary, str) or not summary.strip():
        raise RuntimeError("The AI did not return a valid resume summary.")

    return {"summary": summary.strip()}


async def optimize_resume(
    candidate_resume: dict,
    job_description: str,
    target_job_title: str = "",
) -> dict:
    import json
    from app.services.llm_service import generate_json

    if not isinstance(candidate_resume, dict) or not candidate_resume:
        raise ValueError("Candidate resume data is required.")

    if not job_description or len(job_description.strip()) < 20:
        raise ValueError(
            "Please provide a job description with at least 20 characters."
        )

    prompt = f"""
Analyze the candidate's resume against the target job description.

TARGET JOB TITLE:
{target_job_title or "Not specified"}

CANDIDATE RESUME (JSON):
{json.dumps(candidate_resume, ensure_ascii=False)}

JOB DESCRIPTION:
{job_description}

Return a JSON object with exactly these fields:
{{
    "overall_match_score": 0,
    "matched_keywords": [],
    "missing_keywords": [],
    "skill_gaps": [],
    "suggestions": [],
    "analysis_summary": ""
}}

Rules:
1. overall_match_score must be an integer from 0 to 100.
   It is an approximate resume-to-job alignment estimate, not an actual
   employer ATS score or a probability of getting hired.
2. matched_keywords must contain relevant job-description terms supported
   by the candidate's resume.
3. missing_keywords must contain relevant job-description terms that are
   not clearly present in the resume.
4. skill_gaps must identify requirements not demonstrated by the resume.
   Do not assume the candidate lacks a skill just because it is not listed.
5. suggestions must give specific, truthful ways to improve the resume.
6. Never invent experience, skills, projects, qualifications, certifications,
   achievements, employers, or numerical results.
7. Do not recommend adding a missing skill as if the candidate already has it.
   Suggest learning it or adding it only if the candidate genuinely has it.
8. Use concise strings for all list items.
9. Return only valid JSON. Do not include Markdown fences.
"""

    system_prompt = """
You are a careful ATS resume analyst.
Evaluate evidence in the supplied resume against the job requirements.
Be honest, specific, and conservative. Never fabricate candidate information.
"""

    result = await generate_json(
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=0.1,
    )

    score = result.get("overall_match_score")
    if not isinstance(score, (int, float)) or isinstance(score, bool):
        raise RuntimeError("AI returned an invalid ATS match score.")

    result["overall_match_score"] = max(0, min(100, round(score)))

    list_fields = [
        "matched_keywords",
        "missing_keywords",
        "skill_gaps",
        "suggestions",
    ]

    for field in list_fields:
        if not isinstance(result.get(field), list):
            raise RuntimeError(
                f"AI returned an invalid value for {field}."
            )

        result[field] = [
            item.strip()
            for item in result[field]
            if isinstance(item, str) and item.strip()
        ]

    if not isinstance(result.get("analysis_summary"), str):
        result["analysis_summary"] = ""

    return result

