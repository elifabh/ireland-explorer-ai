import os
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

mongo_url = os.environ.get("MONGO_URL")
if not mongo_url:
    # Fallback or error - simplistic handling for now
    # Ideally should raise, but maybe env is loaded later?
    # Server.py loads env. database.py might be imported after env load if imported by server.
    pass

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "ireland_travel")]
