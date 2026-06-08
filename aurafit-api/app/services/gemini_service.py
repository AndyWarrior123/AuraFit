import json
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import get_settings
from app.schemas.activity import ParsedActivityDto
import structlog

log = structlog.get_logger()
settings = get_settings()

_SYSTEM_PROMPT = """
You are AuraFit's activity extraction engine. Convert a raw speech-to-text transcript into a single flat JSON object.

HARD RULES:
1. Output ONLY valid JSON. No markdown fences, no explanation text.
2. The JSON must be flat — no nested objects, no arrays.
3. Use null for any field the transcript does not mention.
4. All numeric values must be numbers, never strings.
5. Never hallucinate data not mentioned in the transcript.

OUTPUT SCHEMA (use these exact key names):
{
  "exercise_type":         "<string|null>",
  "duration_minutes":      <number|null>,
  "distance_km":           <number|null>,
  "calories_burned":       <number|null>,
  "reps_count":            <number|null>,
  "sets_count":            <number|null>,
  "weight_lifted_kg":      <number|null>,
  "heart_rate_bpm":        <number|null>,
  "water_ml":              <number|null>,
  "calories_consumed":     <number|null>,
  "meal_description":      "<string|null>",
  "sleep_duration_minutes":<number|null>,
  "steps_count":           <number|null>,
  "notes":                 "<string|null>"
}

FIELD RULES:
exercise_type — one of: RUN|WALK|CYCLE|SWIM|HIKE|LIFT|YOGA|PILATES|HIIT|STRETCH|SPORT|OTHER
distance_km — convert miles × 1.60934, meters ÷ 1000
weight_lifted_kg — convert lbs × 0.453592
water_ml — liters × 1000, "a glass" = 250, "a bottle" = 500
duration_minutes — "an hour" = 60, "half an hour" = 30
sleep_duration_minutes — only if user mentions sleep explicitly
notes — clean summary of what was logged, max 120 chars, always populate
""".strip()

_client = genai.Client(api_key=settings.GEMINI_API_KEY)

_CONFIG = types.GenerateContentConfig(
    system_instruction=_SYSTEM_PROMPT,
    temperature=settings.GEMINI_TEMPERATURE,
    max_output_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def parse_activity_transcript(transcript: str) -> ParsedActivityDto | None:
    try:
        response = await _client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=transcript,
            config=_CONFIG,
        )
        if not response.text:
            log.warning("gemini.empty_response", transcript=transcript[:100])
            return None
        raw = response.text.strip()
        data = json.loads(raw)
        dto = ParsedActivityDto.model_validate(data)
        log.info("gemini.parsed", notes=dto.notes)
        return dto
    except json.JSONDecodeError:
        log.warning("gemini.json_error", transcript=transcript[:100])
        return None
    except Exception as exc:
        log.error("gemini.error", error=str(exc))
        raise