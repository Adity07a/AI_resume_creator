import logging
from datetime import timedelta

from asgiref.sync import async_to_sync
from arq import create_pool
from arq.connections import RedisSettings

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from ai_jobs.models import AIJob


logger = logging.getLogger(__name__)


STALE_ERROR = (
    "The previous worker execution became stale. "
    "An automatic retry has been scheduled."
)


async def enqueue_recovered_job(job_id: str, attempt: int):
    """Queue a recovered execution with a distinct ARQ job ID."""

    redis = await create_pool(
        RedisSettings.from_dsn(settings.REDIS_URL)
    )

    try:
        # A new ID avoids colliding with the original ARQ job ID.
        # Repeated recovery of the same attempt uses the same ID.
        return await redis.enqueue_job(
            "process_ai_job",
            job_id,
            _job_id=f"ai-job-{job_id}-recovery-{attempt}",
            _expires=6 * 60 * 60,
        )
    finally:
        await redis.close(close_connection_pool=True)


class Command(BaseCommand):
    help = "Recover AI jobs stuck in PROCESSING."

    def add_arguments(self, parser):
        parser.add_argument(
            "--minutes",
            type=int,
            default=10,
            help="Minimum age of a stale job in minutes (default: 10).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Maximum number of stale jobs to inspect (default: 100).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report stale jobs without changing or queuing them.",
        )

    def handle(self, *args, **options):
        minutes = options["minutes"]
        limit = options["limit"]
        dry_run = options["dry_run"]

        if minutes < 1:
            raise CommandError("--minutes must be at least 1.")

        if limit < 1:
            raise CommandError("--limit must be at least 1.")

        now = timezone.now()
        cutoff = now - timedelta(minutes=minutes)

        stale_condition = (
            Q(started_at__lt=cutoff)
            | Q(
                started_at__isnull=True,
                updated_at__lt=cutoff,
            )
        )

        candidate_ids = list(
            AIJob.objects.filter(
                status=AIJob.Status.PROCESSING,
            )
            .filter(stale_condition)
            .order_by("started_at", "created_at")
            .values_list("id", flat=True)[:limit]
        )

        if dry_run:
            self.stdout.write(
                f"Dry run: found {len(candidate_ids)} stale "
                "PROCESSING job(s). No changes made."
            )
            for job_id in candidate_ids:
                self.stdout.write(str(job_id))
            return

        requeued = 0
        failed = 0
        skipped = 0
        enqueue_errors = 0

        for job_id in candidate_ids:
            with transaction.atomic():
                job = (
                    AIJob.objects.select_for_update()
                    .filter(
                        pk=job_id,
                        status=AIJob.Status.PROCESSING,
                    )
                    .filter(stale_condition)
                    .first()
                )

                # Another worker or command may have changed its state.
                if job is None:
                    skipped += 1
                    continue

                now = timezone.now()

                # max_retries=3 allows 4 total executions.
                if job.attempts >= job.max_retries + 1:
                    started = job.started_at or job.updated_at

                    job.status = AIJob.Status.FAILED
                    job.error_message = (
                        "Job remained stuck after all allowed attempts. "
                        "Manual investigation may be required."
                    )
                    job.completed_at = now
                    job.duration_ms = max(
                        0,
                        int((now - started).total_seconds() * 1000),
                    )

                    job.save(
                        update_fields=[
                            "status",
                            "error_message",
                            "completed_at",
                            "duration_ms",
                            "updated_at",
                        ]
                    )
                    failed += 1

                    logger.error(
                        "Stale AI job exhausted retries: id=%s",
                        job_id,
                    )
                    continue

                previous_attempts = job.attempts
                recovery_attempt = previous_attempts + 1

                # Keep started_at unchanged until the worker starts again.
                # If Redis fails, this record can be discovered next time.
                job.status = AIJob.Status.QUEUED
                job.error_message = STALE_ERROR
                job.completed_at = None

                job.save(
                    update_fields=[
                        "status",
                        "error_message",
                        "completed_at",
                        "updated_at",
                    ]
                )

            try:
                async_to_sync(enqueue_recovered_job)(
                    str(job_id),
                    recovery_attempt,
                )

                requeued += 1

                logger.warning(
                    "Requeued stale AI job: id=%s next_attempt=%s",
                    job_id,
                    recovery_attempt,
                )

            except Exception:
                enqueue_errors += 1

                logger.exception(
                    "Could not requeue stale AI job id=%s",
                    job_id,
                )

                # Return it to PROCESSING so another scheduled run can
                # rediscover it. Do not overwrite a worker that has
                # already claimed the next attempt.
                AIJob.objects.filter(
                    pk=job_id,
                    status=AIJob.Status.QUEUED,
                    attempts=previous_attempts,
                ).update(
                    status=AIJob.Status.PROCESSING,
                    error_message=(
                        "Automatic recovery could not reach Redis. "
                        "The recovery command should retry."
                    ),
                    updated_at=timezone.now(),
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Stale AI job recovery complete: "
                f"requeued={requeued}, "
                f"failed={failed}, "
                f"skipped={skipped}, "
                f"enqueue_errors={enqueue_errors}"
            )
        )