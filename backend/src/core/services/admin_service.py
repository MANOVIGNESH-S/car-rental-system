from uuid import UUID
from typing import Any
from src.data.repositories.user_repository import UserRepository
from src.core.exceptions.base import NotFoundError, ForbiddenError
from src.schemas.admin import (
    AdminUserListItem,
    AdminUserListResponse,
    AdminUserDetail,
    SuspendUserResponse,
    UpdateRoleResponse
)
from src.observability.logging.logger import get_logger

logger = get_logger(__name__)

class AdminService:
    @staticmethod
    async def list_users(
        conn: Any,
        kyc_status: str | None,
        role: str | None,
        is_suspended: bool | None,
        page: int,
        limit: int,
    ) -> AdminUserListResponse:
        rows, total = await UserRepository.get_all_users(
            conn, kyc_status, role, is_suspended, page, limit
        )
        
        user_list = [AdminUserListItem(**row) for row in rows]
        
        return AdminUserListResponse(
            users=user_list,
            total=total,
            page=page,
            limit=limit,
        )

    @staticmethod
    async def suspend_user(
        conn: Any,
        target_user_id: UUID,
        is_suspended: bool,
        requesting_admin_id: UUID,
    ) -> SuspendUserResponse:
        target_user = await UserRepository.get_by_id(conn, target_user_id)
        if not target_user:
            raise NotFoundError("User")

        if target_user["role"] == "Admin":
            raise ForbiddenError("Cannot suspend another Admin account")

        updated = await UserRepository.update_suspension(conn, target_user_id, is_suspended)
        
        logger.info(f"User {target_user_id} suspension set to {is_suspended} by {requesting_admin_id}")
        
        return SuspendUserResponse(**updated)

    @staticmethod
    async def update_user_role(
        conn: Any,
        target_user_id: UUID,
        new_role: str,
        requesting_admin_id: UUID,
    ) -> UpdateRoleResponse:
        if target_user_id == requesting_admin_id:
            raise ForbiddenError("Cannot change your own role")

        target_user = await UserRepository.get_by_id(conn, target_user_id)
        if not target_user:
            raise NotFoundError("User")

        if new_role == "Admin":
            raise ForbiddenError("Cannot assign Admin role via API")

        updated = await UserRepository.update_role(conn, target_user_id, new_role)
        
        logger.info(f"User {target_user_id} role changed to {new_role} by {requesting_admin_id}")
        
        return UpdateRoleResponse(**updated)

    @staticmethod
    async def get_user_detail(
        conn: Any,
        user_id: UUID,
    ) -> AdminUserDetail:
        """Return a single user with presigned KYC document URLs."""
        from src.data.clients.s3_client import s3_client

        user = await UserRepository.get_by_id(conn, user_id)
        if not user:
            raise NotFoundError("User")

        user = dict(user)

        # Presign selfie and license URLs if present
        selfie_url = None
        license_url = None
        if user.get("selfie_url"):
            try:
                selfie_url = s3_client.presign(user["selfie_url"], expires_in=900)
            except Exception:
                pass
        if user.get("license_url"):
            try:
                license_url = s3_client.presign(user["license_url"], expires_in=900)
            except Exception:
                pass

        # Exclude raw DB URL columns AND password_hash from the spread.
        # license_url is a real column in the users table — without excluding it
        # here, it arrives BOTH via **user spread AND as an explicit kwarg → TypeError.
        _exclude = {"selfie_url", "license_url", "dl_front_url", "dl_back_url", "password_hash"}
        return AdminUserDetail(
            **{k: v for k, v in user.items() if k not in _exclude},
            selfie_url=selfie_url,
            license_url=license_url,
        )