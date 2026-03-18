"""
Shared router -- endpoints accessible to any authenticated user regardless of role.
Currently exposes teacher listing so students can select teachers for complaints/messages.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Teacher, User
from app.schemas import TeacherOut

router = APIRouter(prefix="/api/shared", tags=["shared"])


@router.get("/teachers", response_model=list[TeacherOut])
async def list_teachers_shared(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),   # any valid JWT, any role
):
    """
    Returns all teachers. Accessible to students, teachers, and admins.
    Used by students when filing complaints or sending messages.
    Only exposes name + department -- not sensitive fields.
    """
    result = await db.execute(
        select(Teacher).options(selectinload(Teacher.department))
    )
    return result.scalars().all()
