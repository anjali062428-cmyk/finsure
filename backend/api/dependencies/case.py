"""
FinSure Case Service Dependency Providers
Provides singleton instances for CaseRepository, CaseService, InvestigatorToolSandbox,
and FinSureInvestigatorService.
"""

from typing import Optional
from backend.repositories.case_repo import CaseRepository
from backend.services.case_service import CaseService
from backend.services.tool_sandbox import InvestigatorToolSandbox
from backend.services.investigator_service import FinSureInvestigatorService
from backend.api.dependencies.incident import get_incident_repo, get_similarity_service

_case_repo: Optional[CaseRepository] = None
_case_service: Optional[CaseService] = None
_tool_sandbox: Optional[InvestigatorToolSandbox] = None
_investigator_service: Optional[FinSureInvestigatorService] = None


def get_case_repo() -> CaseRepository:
    global _case_repo
    if _case_repo is None:
        _case_repo = CaseRepository()
    return _case_repo


def get_tool_sandbox() -> InvestigatorToolSandbox:
    global _tool_sandbox
    if _tool_sandbox is None:
        c_repo = get_case_repo()
        i_repo = get_incident_repo()
        sim_svc = get_similarity_service()
        _tool_sandbox = InvestigatorToolSandbox(c_repo, i_repo, sim_svc)
    return _tool_sandbox


def get_case_service() -> CaseService:
    global _case_service
    if _case_service is None:
        c_repo = get_case_repo()
        i_repo = get_incident_repo()
        sim_svc = get_similarity_service()
        _case_service = CaseService(c_repo, i_repo, sim_svc)
    return _case_service


def get_investigator_service() -> FinSureInvestigatorService:
    global _investigator_service
    if _investigator_service is None:
        c_repo = get_case_repo()
        i_repo = get_incident_repo()
        sandbox = get_tool_sandbox()
        _investigator_service = FinSureInvestigatorService(c_repo, sandbox, i_repo)
    return _investigator_service


def set_custom_case_repo(repo: CaseRepository):
    global _case_repo, _case_service, _tool_sandbox, _investigator_service
    _case_repo = repo
    _case_service = None
    _tool_sandbox = None
    _investigator_service = None


def set_custom_case_service(service: CaseService):
    global _case_service
    _case_service = service


def set_custom_investigator_service(service: FinSureInvestigatorService):
    global _investigator_service
    _investigator_service = service
