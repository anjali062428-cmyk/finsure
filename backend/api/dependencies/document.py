"""
FinSure Document Dependency Providers
Provides singleton instances for DocumentRepository and DocumentService.
"""

from typing import Optional
from backend.repositories.document_repo import DocumentRepository
from backend.services.document_service import DocumentService

_document_repo: Optional[DocumentRepository] = None
_document_service: Optional[DocumentService] = None


def get_document_repo() -> DocumentRepository:
    global _document_repo
    if _document_repo is None:
        _document_repo = DocumentRepository()
    return _document_repo


def get_document_service() -> DocumentService:
    global _document_service
    if _document_service is None:
        repo = get_document_repo()
        _document_service = DocumentService(repo)
    return _document_service


def set_custom_document_repo(repo: DocumentRepository):
    global _document_repo, _document_service
    _document_repo = repo
    _document_service = None


def set_custom_document_service(service: DocumentService):
    global _document_service
    _document_service = service
