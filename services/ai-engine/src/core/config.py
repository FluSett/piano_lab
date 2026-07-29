import os

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Piano Lab AI Engine"
    port: int = int(os.getenv("PORT", os.getenv("AI_PORT", "8000")))
    process_pool_workers: int = int(os.getenv("PROCESS_POOL_WORKERS", "4"))
    device: str = os.getenv("DEVICE", "cpu")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    references_dir: str = os.getenv("REFERENCES_DIR", "assets/references")
    coach_config_path: str = os.getenv("COACH_CONFIG_PATH", "config/coach_config.json")
    default_reference_id: str = os.getenv("DEFAULT_REFERENCE_ID", "pirates-of-the-caribbean")
    gemini_temperature: float = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
    gemini_max_tokens: int = int(os.getenv("GEMINI_MAX_TOKENS", "500"))
    pitch_accuracy_threshold: float = float(os.getenv("PITCH_ACCURACY_THRESHOLD", "90.0"))
    placeholder_api_key: str = "your_gemini_api_key_here"


settings = Settings()

