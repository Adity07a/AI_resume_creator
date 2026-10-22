

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import AIJob
import httpx
from datetime import timedelta
from asgiref.sync import async_to_sync
from arq import Retry
from unittest.mock import patch,AsyncMock
from django.core.management import call_command
from django.utils import timezone
from ai_jobs.worker import process_ai_job,_start_job

User = get_user_model()


class AIJobAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="ai_job_user",
            email="ai_job_user@example.com",
            password="StrongPassword123!",
        )

        self.other_user = User.objects.create_user(
            username="other_ai_job_user",
            email="other_ai_job_user@example.com",
            password="StrongPassword123!",
        )

        self.client.force_authenticate(user=self.user)

    def test_submit_job_returns_accepted(self):
        payload = {
            "job_type": "PARSE_JOB",
            "payload": {
                "description": (
                    "Python developer required with Django, "
                    "REST APIs, SQL, and testing experience."
                )
            },
        }

        async def fake_enqueue(job_id):
            return None

        with patch(
            "ai_jobs.views.enqueue_ai_job",
            new=fake_enqueue,
        ):
            response = self.client.post(
                "/api/v1/ai-jobs/",
                payload,
                format="json",
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_202_ACCEPTED,
        )

        job = AIJob.objects.get(
            pk=response.data["id"],
            user=self.user,
        )

        self.assertEqual(job.job_type, AIJob.JobType.PARSE_JOB)
        self.assertEqual(job.status, AIJob.Status.QUEUED)

    def test_short_job_description_is_rejected(self):
        response = self.client.post(
            "/api/v1/ai-jobs/",
            {
                "job_type": "PARSE_JOB",
                "payload": {
                    "description": "Too short",
                },
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_user_cannot_poll_another_users_job(self):
        job = AIJob.objects.create(
            user=self.other_user,
            job_type=AIJob.JobType.PARSE_JOB,
            status=AIJob.Status.COMPLETED,
            input_payload={
                "description": "Private job description",
            },
            output_payload={
                "job_title": "Private result",
            },
        )

        response = self.client.get(
            f"/api/v1/ai-jobs/{job.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_poll_returns_status_for_job_owner(self):
        job = AIJob.objects.create(
            user=self.user,
            job_type=AIJob.JobType.PARSE_JOB,
            status=AIJob.Status.COMPLETED,
            input_payload={},
            output_payload={
                "job_title": "Python Developer",
            },
        )

        response = self.client.get(
            f"/api/v1/ai-jobs/{job.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["status"],
            AIJob.Status.COMPLETED,
        )
        self.assertEqual(
            response.data["output_payload"]["job_title"],
            "Python Developer",
        )

class FakeAsyncClient:
    """Fake HTTPX client for worker tests."""

    def __init__(self, response):
        self.response = response
        self.url = None
        self.json_payload = None
        self.headers = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return None

    async def post(self, url, json, headers):
        self.url = url
        self.json_payload = json
        self.headers = headers
        return self.response


class AIWorkerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="worker_test_user",
            email="worker_test@example.com",
            password="StrongPassword123!",
        )

    def create_job(self, job_type, payload):
        return AIJob.objects.create(
            user=self.user,
            job_type=job_type,
            status=AIJob.Status.QUEUED,
            input_payload=payload,
            max_retries=3,
            model_used="qwen2.5:3b",
        )

    def run_worker(self, job, response, attempt=1):
        fake_client = FakeAsyncClient(response)

        with patch(
            "ai_jobs.worker.httpx.AsyncClient",
            return_value=fake_client,
        ):
            result = async_to_sync(process_ai_job)(
                {"job_try": attempt},
                str(job.id),
            )

        return result, fake_client

    @staticmethod
    def make_response(result, status_code=200):
        request = httpx.Request(
            "POST",
            "http://test-ai-service/api/v1/ai/test",
        )

        return httpx.Response(
            status_code,
            json=result,
            request=request,
        )

    def test_generate_summary_job_completes(self):
        result = {"summary": "Python developer experienced in REST APIs."}

        job = self.create_job(
            AIJob.JobType.GENERATE_SUMMARY,
            {
                "candidate_resume": {
                    "skills": ["Python", "Django"],
                },
                "target_job_title": "Python Developer",
            },
        )

        _, fake_client = self.run_worker(
            job,
            self.make_response(result),
        )

        job.refresh_from_db()

        self.assertEqual(job.status, AIJob.Status.COMPLETED)
        self.assertEqual(job.output_payload, result)
        self.assertTrue(
            fake_client.url.endswith("/api/v1/ai/generate-summary")
        )

    def test_improve_section_job_completes(self):
        result = {
            "section_name": "summary",
            "improved_content": "Improved professional summary.",
            "changes_summary": "Clearer and more concise.",
        }

        job = self.create_job(
            AIJob.JobType.IMPROVE_SECTION,
            {
                "section_name": "summary",
                "section_content": "Python developer.",
            },
        )

        _, fake_client = self.run_worker(
            job,
            self.make_response(result),
        )

        job.refresh_from_db()

        self.assertEqual(job.status, AIJob.Status.COMPLETED)
        self.assertEqual(job.output_payload, result)
        self.assertTrue(
            fake_client.url.endswith("/api/v1/ai/improve-section")
        )

    def test_optimize_resume_job_completes(self):
        result = {
            "overall_match_score": 80,
            "matched_keywords": ["Python", "SQL"],
            "missing_keywords": ["Docker"],
            "skill_gaps": ["Docker experience not listed"],
            "suggestions": ["Add relevant project details if accurate."],
            "analysis_summary": "Good alignment with the role.",
        }

        job = self.create_job(
            AIJob.JobType.OPTIMIZE_RESUME,
            {
                "candidate_resume": {"skills": ["Python", "SQL"]},
                "job_description": (
                    "Python developer required with SQL, APIs, "
                    "and testing experience."
                ),
            },
        )

        _, fake_client = self.run_worker(
            job,
            self.make_response(result),
        )

        job.refresh_from_db()

        self.assertEqual(job.status, AIJob.Status.COMPLETED)
        self.assertEqual(job.output_payload, result)
        self.assertTrue(
            fake_client.url.endswith("/api/v1/ai/optimize-resume")
        )

    def test_generate_resume_saves_resume_and_sections(self):
        generated_resume = {
            "personal_info": {
                "full_name": "Test Candidate",
                "email": "worker_test@example.com",
                "phone": "",
                "location": "",
                "linkedin": "",
                "github": "",
                "portfolio": "",
            },
            "summary": "Python developer with API experience.",
            "skills": ["Python", "Django"],
            "experience": [],
            "projects": [],
            "education": [],
            "certifications": [],
            "achievements": [],
            "languages": [],
            "links": [],
        }

        job = self.create_job(
            AIJob.JobType.GENERATE_RESUME,
            {
                "candidate_resume": generated_resume,
                "job_description": (
                    "Python developer required with Django, REST APIs, "
                    "SQL, and testing experience."
                ),
                "target_job_title": "Python Developer",
                "resume_title": "Worker Test Resume",
            },
        )

        self.run_worker(
            job,
            self.make_response(generated_resume),
        )

        job.refresh_from_db()

        self.assertEqual(job.status, AIJob.Status.COMPLETED)
        self.assertIn("generated_resume", job.output_payload)
        self.assertIn("resume", job.output_payload)

        from resumes.models import Resume, ResumeVersion, ResumeSection

        resume = Resume.objects.get(
            user=self.user,
            title="Worker Test Resume",
        )

        version = ResumeVersion.objects.get(
            resume=resume,
            version_number=1,
        )

        self.assertEqual(
            ResumeSection.objects.filter(version=version).count(),
            10,
        )

        self.assertTrue(version.is_current)

    def test_temporary_ai_error_schedules_retry(self):
        job = self.create_job(
            AIJob.JobType.PARSE_JOB,
            {
                "description": (
                    "Python developer required with Django, "
                    "REST APIs, SQL, and testing experience."
                ),
            },
        )

        response = self.make_response(
            {"detail": "Temporary unavailable"},
            status_code=503,
        )

        with self.assertRaises(Retry):
            self.run_worker(job, response, attempt=1)

        job.refresh_from_db()

        self.assertEqual(job.status, AIJob.Status.QUEUED)
        self.assertEqual(job.attempts, 1)
        self.assertIn("temporarily unavailable", job.error_message)

    def test_temporary_ai_error_fails_after_final_attempt(self):
        job = self.create_job(
            AIJob.JobType.PARSE_JOB,
            {
                "description": (
                    "Python developer required with Django, "
                    "REST APIs, SQL, and testing experience."
                ),
            },
        )

        response = self.make_response(
            {"detail": "Temporary unavailable"},
            status_code=503,
        )

        self.run_worker(job, response, attempt=4)

        job.refresh_from_db()

        self.assertEqual(job.status, AIJob.Status.FAILED)
        self.assertEqual(job.attempts, 4)
        self.assertTrue(job.completed_at)
        self.assertTrue(job.error_message)

class AIJobHistoryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            username="history_user",
            email="history@example.com",
            password="StrongPassword123!",
        )

        self.other_user = User.objects.create_user(
            username="history_other",
            email="history_other@example.com",
            password="StrongPassword123!",
        )

        self.client.force_authenticate(user=self.user)

    def create_job(
        self,
        user,
        job_type,
        job_status,
    ):
        return AIJob.objects.create(
            user=user,
            job_type=job_type,
            status=job_status,
            input_payload={},
        )

    def test_history_returns_only_authenticated_users_jobs(self):
        own_job = self.create_job(
            self.user,
            AIJob.JobType.PARSE_JOB,
            AIJob.Status.COMPLETED,
        )

        self.create_job(
            self.other_user,
            AIJob.JobType.PARSE_JOB,
            AIJob.Status.FAILED,
        )

        response = self.client.get(
            "/api/v1/ai-jobs/history/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            str(response.data["results"][0]["id"]),
            str(own_job.id),
        )

    def test_history_filters_by_status(self):
        self.create_job(
            self.user,
            AIJob.JobType.PARSE_JOB,
            AIJob.Status.COMPLETED,
        )
        self.create_job(
            self.user,
            AIJob.JobType.PARSE_JOB,
            AIJob.Status.FAILED,
        )

        response = self.client.get(
            "/api/v1/ai-jobs/history/?status=FAILED"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["status"],
            AIJob.Status.FAILED,
        )

    def test_history_filters_by_job_type(self):
        self.create_job(
            self.user,
            AIJob.JobType.PARSE_JOB,
            AIJob.Status.COMPLETED,
        )
        self.create_job(
            self.user,
            AIJob.JobType.GENERATE_SUMMARY,
            AIJob.Status.COMPLETED,
        )

        response = self.client.get(
            "/api/v1/ai-jobs/history/?job_type=GENERATE_SUMMARY"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["job_type"],
            AIJob.JobType.GENERATE_SUMMARY,
        )

    def test_invalid_status_returns_400(self):
        response = self.client.get(
            "/api/v1/ai-jobs/history/?status=INVALID"
        )

        self.assertEqual(response.status_code, 400)

    def test_history_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(
            "/api/v1/ai-jobs/history/"
        )

        self.assertEqual(response.status_code, 401)


class StaleAIJobRecoveryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="recovery_user",
            email="recovery@example.com",
            password="StrongPassword123!",
        )

    def create_stale_job(self, attempts=1, max_retries=3):
        return AIJob.objects.create(
            user=self.user,
            job_type=AIJob.JobType.PARSE_JOB,
            status=AIJob.Status.PROCESSING,
            input_payload={
                "description": (
                    "Python developer required with Django, "
                    "REST APIs, PostgreSQL, and testing."
                )
            },
            attempts=attempts,
            max_retries=max_retries,
            started_at=timezone.now() - timedelta(minutes=20),
        )

    @patch(
        "ai_jobs.management.commands.recover_stale_ai_jobs."
        "enqueue_recovered_job",
        new_callable=AsyncMock,
    )
    def test_stale_job_is_requeued(self, enqueue_mock):
        job = self.create_stale_job(attempts=1)

        call_command(
            "recover_stale_ai_jobs",
            "--minutes",
            "10",
        )

        job.refresh_from_db()

        self.assertEqual(job.status, AIJob.Status.QUEUED)
        self.assertEqual(job.attempts, 1)
        enqueue_mock.assert_awaited_once_with(str(job.id), 2)

    @patch(
        "ai_jobs.management.commands.recover_stale_ai_jobs."
        "enqueue_recovered_job",
        new_callable=AsyncMock,
    )
    def test_exhausted_stale_job_is_failed(self, enqueue_mock):
        job = self.create_stale_job(attempts=4, max_retries=3)

        call_command(
            "recover_stale_ai_jobs",
            "--minutes",
            "10",
        )

        job.refresh_from_db()

        self.assertEqual(job.status, AIJob.Status.FAILED)
        self.assertIsNotNone(job.completed_at)
        self.assertTrue(job.error_message)
        enqueue_mock.assert_not_awaited()

    @patch(
        "ai_jobs.management.commands.recover_stale_ai_jobs."
        "enqueue_recovered_job",
        new_callable=AsyncMock,
    )
    def test_recently_started_job_is_untouched(self, enqueue_mock):
        job = AIJob.objects.create(
            user=self.user,
            job_type=AIJob.JobType.PARSE_JOB,
            status=AIJob.Status.PROCESSING,
            input_payload={},
            attempts=1,
            started_at=timezone.now(),
        )

        call_command(
            "recover_stale_ai_jobs",
            "--minutes",
            "10",
        )

        job.refresh_from_db()

        self.assertEqual(job.status, AIJob.Status.PROCESSING)
        enqueue_mock.assert_not_awaited()

    def test_recovered_execution_increments_attempt(self):
        job = self.create_stale_job(attempts=1)
        job.status = AIJob.Status.QUEUED
        job.save(update_fields=["status", "updated_at"])

        state = _start_job(str(job.id), attempt=1)

        job.refresh_from_db()

        self.assertEqual(state["attempt"], 2)
        self.assertEqual(job.attempts, 2)
        self.assertEqual(job.status, AIJob.Status.PROCESSING)

    def test_completed_job_is_not_restarted(self):
        job = AIJob.objects.create(
            user=self.user,
            job_type=AIJob.JobType.PARSE_JOB,
            status=AIJob.Status.COMPLETED,
            input_payload={},
            output_payload={"job_title": "Python Developer"},
            attempts=1,
        )

        state = _start_job(str(job.id), attempt=1)

        self.assertTrue(state["already_completed"])
        self.assertEqual(
            state["output_payload"]["job_title"],
            "Python Developer",
        )


