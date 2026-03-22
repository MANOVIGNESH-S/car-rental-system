from uuid import UUID
from typing import Any

from src.data.repositories.user_repository import UserRepository
from src.core.exceptions.base import NotFoundError
from src.schemas.user import (
    ProfileResponse, 
    UpdateProfileRequest, 
    UpdateProfileResponse
)


class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def get_profile(self, conn: Any, user_id: UUID) -> ProfileResponse:
        """
        Retrieves the profile for a specific user.
        """
        user = await self.user_repo.get_by_id(conn, user_id)
        
        if not user:
            raise NotFoundError("User")
            
        return ProfileResponse.model_validate(user)

    async def update_profile(
        self, 
        conn: Any, 
        user_id: UUID, 
        data: UpdateProfileRequest
    ) -> UpdateProfileResponse:
        """
        Updates allowed profile fields and returns the updated record.
        """
        user = await self.user_repo.get_by_id(conn, user_id)
        if not user:
            raise NotFoundError("User")

        updated_dict = await self.user_repo.update_profile(
            conn, 
            user_id=user_id, 
            full_name=data.full_name, 
            phone_number=data.phone_number
        )
        
        return UpdateProfileResponse.model_validate(updated_dict)