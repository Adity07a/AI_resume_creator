
from rest_framework.routers import DefaultRouter

from .views import ResumeSectionViewSet

router = DefaultRouter()
router.register(
    "",
    ResumeSectionViewSet,
    basename="resume-section",
)

urlpatterns = router.urls
