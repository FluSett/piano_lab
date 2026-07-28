import json
import logging
from pathlib import Path

from src.core.config import settings
from src.domain.schemas import CoachRequest, CoachResponse

logger = logging.getLogger(__name__)


def _load_coach_config() -> dict[str, str | list[str]]:
    base_config = Path(__file__).resolve().parent.parent.parent / "config" / "coach_config.json"
    paths = [
        Path(settings.coach_config_path),
        base_config,
        Path("config/coach_config.json"),
        Path("../config/coach_config.json"),
    ]
    for p in paths:
        if p.is_file():
            try:
                with p.open("r", encoding="utf-8") as f:
                    data: dict[str, str | list[str]] = json.load(f)
                    return data
            except Exception as e:
                logger.warning(f"Failed to read coach config at {p}: {e}")

    raise FileNotFoundError(
        f"Coach configuration file '{settings.coach_config_path}' could not be located."
    )


class AICoachService:
    def __init__(self) -> None:
        self.api_key = settings.gemini_api_key
        self.model_name = settings.gemini_model
        self.config = _load_coach_config()
        raw_keywords = self.config.get("pianoKeywords", [])
        if isinstance(raw_keywords, list):
            self.piano_keywords = [k for k in raw_keywords if isinstance(k, str)]
        else:
            self.piano_keywords = []
        self.system_instruction: str = str(self.config.get("systemInstruction", ""))
        self.off_topic_message: str = str(self.config.get("offTopicMessage", ""))
        self.missing_key_message: str = str(
            self.config.get(
                "missingKeyMessage",
                "Gemini AI Coach requires GEMINI_API_KEY in .env to enable live AI coaching.",
            )
        )

        self._genai_client = None

        if self.api_key and self.api_key != settings.placeholder_api_key:
            try:
                import importlib

                genai_module = importlib.import_module("google.genai")
                self._genai_client = genai_module.Client(api_key=self.api_key)

                logger.info(f"Initialized Google GenAI client with model {self.model_name}")
            except Exception as e:
                logger.warning(f"Failed to initialize Google GenAI SDK: {e}")

    def generate_coach_response(self, request: CoachRequest) -> CoachResponse:
        user_text = request.user_message.strip()

        is_piano_related = any(kw in user_text.lower() for kw in self.piano_keywords)
        if not is_piano_related:
            return CoachResponse(
                reply_message=self.off_topic_message,
                is_off_topic=True,
                suggested_measures=[],
            )

        context_str = ""
        suggested_measures: list[int] = []
        if request.recent_performance_data:
            perf = request.recent_performance_data
            missed_notes = [n for n in perf.evaluated_notes if n.status == "MISSED"]
            if missed_notes:
                measures = sorted({n.measure_number for n in missed_notes})
                suggested_measures = measures[:3]

            context_str = (
                f"Student Performance Context:\n"
                f"- Overall Score: {perf.overall_score}%\n"
                f"- Pitch Accuracy: {perf.pitch_accuracy}%\n"
                f"- Rhythm Accuracy: {perf.rhythm_accuracy}%\n"
                f"- Partial Performance Excerpt: {perf.is_partial_performance}\n"
                f"- Evaluated Notes: {len(perf.evaluated_notes)}\n"
                f"- Missed Measures: {suggested_measures}\n"
            )

        if self._genai_client is not None:
            try:
                prompt = f"{context_str}\nStudent Question: {user_text}"
                response = self._genai_client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config={
                        "system_instruction": self.system_instruction,
                        "temperature": settings.gemini_temperature,
                        "max_output_tokens": settings.gemini_max_tokens,
                    },
                )
                if response and response.text:
                    return CoachResponse(
                        reply_message=response.text.strip(),
                        is_off_topic=False,
                        suggested_measures=suggested_measures,
                    )
            except Exception as e:
                logger.error(f"GenAI SDK execution error: {e}")

        return CoachResponse(
            reply_message=self.missing_key_message,
            is_off_topic=False,
            suggested_measures=suggested_measures,
        )

