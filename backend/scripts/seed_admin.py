from __future__ import annotations

import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config.settings import settings
from src.utils.hashing import hash_password
import asyncpg


async def seed_admin() -> None:
    dsn = settings.database_url.replace("postgresql+asyncpg", "postgresql")
    
    conn = await asyncpg.connect(dsn=dsn)

    try:
        existing = await conn.fetchrow(
            "SELECT user_id, email FROM users WHERE role = 'Admin' LIMIT 1"
        )

        if existing:
            print(f"Admin already exists: {existing['email']}")
            print("Skipping seed.")
            return

        full_name = "Super Admin"
        email = "admin@carrental.com"
        phone_number = "9000000000"
        password = "Admin@123"

        password_hash = hash_password(password)

        admin = await conn.fetchrow(
            """
            INSERT INTO users (full_name, email, phone_number, password_hash, role, kyc_status)
            VALUES ($1, $2, $3, $4, 'Admin', 'verified')
            RETURNING user_id, full_name, email, role
            """,
            full_name,
            email,
            phone_number,
            password_hash,
        )

        print("Admin seeded successfully:")
        print(f"  user_id : {admin['user_id']}")
        print(f"  email   : {admin['email']}")
        print(f"  role    : {admin['role']}")
        print(f"  password: {password}")
        print()
        print("IMPORTANT: Change the password after first login.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_admin())