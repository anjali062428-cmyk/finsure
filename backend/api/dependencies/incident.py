"""
FinSure Incident Service Dependency Providers
Provides singleton instances for repositories and services supporting incidents,
threat replay, reports, and similarity matching.
"""

from typing import Optional
from backend.repositories.incident_repo import IncidentRepository
from backend.services.incident_service import IncidentService
from backend.services.replay_service import ThreatReplayService
from backend.services.report_service import IncidentReportService
from backend.services.similarity_service import SimilarCaseService

_incident_repo: Optional[IncidentRepository] = None
_incident_service: Optional[IncidentService] = None
_replay_service: Optional[ThreatReplayService] = None
_report_service: Optional[IncidentReportService] = None
_similarity_service: Optional[SimilarCaseService] = None


def get_incident_repo() -> IncidentRepository:
    global _incident_repo
    if _incident_repo is None:
        _incident_repo = IncidentRepository()
    return _incident_repo


def get_incident_service() -> IncidentService:
    global _incident_service
    if _incident_service is None:
        repo = get_incident_repo()
        _incident_service = IncidentService(repo)
    return _incident_service


def get_replay_service() -> ThreatReplayService:
    global _replay_service
    if _replay_service is None:
        repo = get_incident_repo()
        _replay_service = ThreatReplayService(repo)
    return _replay_service


def get_report_service() -> IncidentReportService:
    global _report_service
    if _report_service is None:
        repo = get_incident_repo()
        _report_service = IncidentReportService(repo)
    return _report_service


def get_similarity_service() -> SimilarCaseService:
    global _similarity_service
    if _similarity_service is None:
        repo = get_incident_repo()
        _similarity_service = SimilarCaseService(repo)
    return _similarity_service


def set_custom_incident_service(service: IncidentService):
    """Allows automated test suites to inject isolated repositories."""
    global _incident_service, _incident_repo, _replay_service, _report_service, _similarity_service
    _incident_service = service
    _incident_repo = service.repo
    _replay_service = ThreatReplayService(service.repo)
    _report_service = IncidentReportService(service.repo)
    _similarity_service = SimilarCaseService(service.repo)
