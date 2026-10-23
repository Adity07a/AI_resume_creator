from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from ai_jobs.models import AIJob
from job_descriptions.models import JobDescription

from .models import (
    Resume,
    ResumeAnalysis,
    ResumeSection,
    ResumeVersion,
)


User = get_user_model()


class ResumeAnalysisAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="analysis_user",
            email="analysis_user@example.com",
            password="StrongPassword123!",
        )

        self.other_user = User.objects.create_user(
            username="other_analysis_user",
            email="other_analysis_user@example.com",
            password="StrongPassword123!",
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.resume = Resume.objects.create(
            user=self.user,
            title="Backend Developer Resume",
        )

        self.version = ResumeVersion.objects.create(
            resume=self.resume,
            version_number=1,
            template_name="ATS Classic",
            is_current=True,
        )

        ResumeSection.objects.create(
            version=self.version,
            section_type="CUSTOM",
            title="Personal Information",
            content={
                "full_name": "Example Candidate",
                "email": "candidate@example.com",
            },
            display_order=0,
            is_visible=True,
        )

        ResumeSection.objects.create(
            version=self.version,
            section_type="SUMMARY",
            title="Professional Summary",
            content={
                "text": (
                    "Backend developer experienced in building "
                    "Python APIs and database-backed applications."
                )
            },
            display_order=1,
            is_visible=True,
        )

        ResumeSection.objects.create(
            version=self.version,
            section_type="SKILLS",
            title="Skills",
            content=["Python", "Django", "REST APIs"],
            display_order=2,
            is_visible=True,
        )

        self.job_description = JobDescription.objects.create(
            user=self.user,
            title="Backend Developer Job",
            job_title="Backend Developer",
            company_name="Example Company",
            description=(
                "We need a Python developer with Django, REST API, "
                "database, testing and deployment experience."
            ),
            parsed_data={
                "job_title": "Backend Developer",
                "required_skills": [
                    "Python",
                    "Django",
                    "REST APIs",
                    "Testing",
                ],
                "preferred_skills": [
                    "Docker",
                ],
                "keywords": [
                    "Python",
                    "Django",
                    "REST APIs",
                    "Testing",
                    "Docker",
                ],
            },
        )

    def _create_analysis(self):
        """Create an analysis record for ownership tests."""
        ai_job = AIJob.objects.create(
            user=self.user,
            job_type=AIJob.JobType.OPTIMIZE_RESUME,
            status=AIJob.Status.COMPLETED,
            input_payload={},
            output_payload={
                "overall_match_score": 75,
                "matched_keywords": ["Python", "Django"],
            },
        )

        return ResumeAnalysis.objects.create(
            user=self.user,
            resume=self.resume,
            resume_version=self.version,
            job_description=self.job_description,
            ai_job=ai_job,
            status=ResumeAnalysis.Status.COMPLETED,
            result=ai_job.output_payload,
        )

    def test_create_analysis_queues_existing_ai_job(self):
        async def fake_enqueue(job_id):
            return None

        with patch(
            "resumes.analysis_views.enqueue_ai_job",
            new=fake_enqueue,
        ):
            response = self.client.post(
                "/api/v1/analysis/",
                {
                    "resume_id": self.resume.id,
                    "resume_version_id": self.version.id,
                    "job_description_id": self.job_description.id,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 202)

        analysis = ResumeAnalysis.objects.get(
            pk=response.data["id"]
        )

        self.assertEqual(
            analysis.status,
            ResumeAnalysis.Status.QUEUED,
        )

        self.assertEqual(
            analysis.ai_job.job_type,
            AIJob.JobType.OPTIMIZE_RESUME,
        )

        self.assertEqual(
            analysis.ai_job.status,
            AIJob.Status.QUEUED,
        )

        self.assertEqual(
            analysis.resume_version_id,
            self.version.id,
        )

        self.assertEqual(
            analysis.job_description_id,
            self.job_description.id,
        )

        self.assertEqual(
            analysis.ai_job.input_payload["parsed_job"][
                "required_skills"
            ],
            ["Python", "Django", "REST APIs", "Testing"],
        )

    def test_defaults_to_current_version(self):
        async def fake_enqueue(job_id):
            return None

        with patch(
            "resumes.analysis_views.enqueue_ai_job",
            new=fake_enqueue,
        ):
            response = self.client.post(
                "/api/v1/analysis/",
                {
                    "resume_id": self.resume.id,
                    "job_description_id": self.job_description.id,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(
            response.data["resume_version_id"],
            self.version.id,
        )

    def test_cannot_analyze_another_users_resume(self):
        other_resume = Resume.objects.create(
            user=self.other_user,
            title="Private Resume",
        )

        ResumeVersion.objects.create(
            resume=other_resume,
            version_number=1,
            is_current=True,
        )

        async def fake_enqueue(job_id):
            return None

        with patch(
            "resumes.analysis_views.enqueue_ai_job",
            new=fake_enqueue,
        ):
            response = self.client.post(
                "/api/v1/analysis/",
                {
                    "resume_id": other_resume.id,
                    "job_description_id": self.job_description.id,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 404)

    def test_cannot_analyze_another_users_job_description(self):
        other_job = JobDescription.objects.create(
            user=self.other_user,
            title="Private Job",
            job_title="Developer",
            company_name="Private Company",
            description=(
                "Python developer required for APIs and databases."
            ),
        )

        async def fake_enqueue(job_id):
            return None

        with patch(
            "resumes.analysis_views.enqueue_ai_job",
            new=fake_enqueue,
        ):
            response = self.client.post(
                "/api/v1/analysis/",
                {
                    "resume_id": self.resume.id,
                    "job_description_id": other_job.id,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 404)

    def test_analysis_list_returns_only_the_current_users_records(self):
        self._create_analysis()

        other_resume = Resume.objects.create(
            user=self.other_user,
            title="Other Resume",
        )

        other_version = ResumeVersion.objects.create(
            resume=other_resume,
            version_number=1,
            is_current=True,
        )

        other_job = JobDescription.objects.create(
            user=self.other_user,
            title="Other Job",
            job_title="Developer",
            company_name="Other Company",
            description="Python developer required for API development.",
        )

        other_ai_job = AIJob.objects.create(
            user=self.other_user,
            job_type=AIJob.JobType.OPTIMIZE_RESUME,
            status=AIJob.Status.COMPLETED,
            input_payload={},
        )

        ResumeAnalysis.objects.create(
            user=self.other_user,
            resume=other_resume,
            resume_version=other_version,
            job_description=other_job,
            ai_job=other_ai_job,
            status=ResumeAnalysis.Status.COMPLETED,
        )

        response = self.client.get("/api/v1/analysis/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["resume_id"],
            self.resume.id,
        )

    def test_user_cannot_retrieve_another_users_analysis(self):
        analysis = self._create_analysis()

        other_resume = Resume.objects.create(
            user=self.other_user,
            title="Other Resume",
        )

        other_version = ResumeVersion.objects.create(
            resume=other_resume,
            version_number=1,
            is_current=True,
        )

        other_job = JobDescription.objects.create(
            user=self.other_user,
            title="Other Job",
            job_title="Developer",
            company_name="Other Company",
            description="Python developer required for API development.",
        )

        other_ai_job = AIJob.objects.create(
            user=self.other_user,
            job_type=AIJob.JobType.OPTIMIZE_RESUME,
            status=AIJob.Status.COMPLETED,
            input_payload={},
        )

        private_analysis = ResumeAnalysis.objects.create(
            user=self.other_user,
            resume=other_resume,
            resume_version=other_version,
            job_description=other_job,
            ai_job=other_ai_job,
            status=ResumeAnalysis.Status.COMPLETED,
        )

        # The current user can retrieve their own analysis.
        own_response = self.client.get(
            f"/api/v1/analysis/{analysis.id}/"
        )
        self.assertEqual(own_response.status_code, 200)

        # The same user cannot retrieve another user's analysis.
        other_response = self.client.get(
            f"/api/v1/analysis/{private_analysis.id}/"
        )
        self.assertEqual(other_response.status_code, 404)

    
    def test_queue_failure_marks_analysis_failed(self):
        async def fail_enqueue(job_id):
            raise RuntimeError("Redis is unavailable")

        with self.assertLogs(
            "resumes.analysis_views",
            level="ERROR",
        ) as captured:
            with patch(
                "resumes.analysis_views.enqueue_ai_job",
                new=fail_enqueue,
            ):
                response = self.client.post(
                    "/api/v1/analysis/",
                    {
                        "resume_id": self.resume.id,
                        "job_description_id": self.job_description.id,
                    },
                    format="json",
                )

        self.assertTrue(
            any(
                "Could not queue resume analysis" in message
                for message in captured.output
            ),
            "Expected the enqueue failure to be logged.",
        )

        self.assertEqual(response.status_code, 503)

        analysis = ResumeAnalysis.objects.get(
            pk=response.data["id"]
        )

        self.assertEqual(
            analysis.status,
            ResumeAnalysis.Status.FAILED,
        )

        self.assertEqual(
            analysis.ai_job.status,
            AIJob.Status.FAILED,
        )
