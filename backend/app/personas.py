"""Visa-interview persona specs and create-or-reuse logic against the Tavus API.

Ports the three original interview agents to Tavus Personas and layers on the
CVI pipeline configuration: perception (Raven, feature #1), STT hotwords and
conversational-flow tuning (feature #6), a pronunciation dictionary (feature #9),
objectives (feature #2), guardrails (feature #5), and knowledge-base documents
(feature #4). The full create payload is hashed, so changing any prompt, layer,
or attached dependency id re-creates the persona instead of reusing a stale one.
"""

from __future__ import annotations

import logging
from typing import Any, Literal

from pydantic import BaseModel, Field

from . import cache
from .tavus import TavusApiError, TavusClient

logger = logging.getLogger(__name__)

VisaType = Literal["b1b2", "f1", "n400"]
VISA_TYPES: tuple[VisaType, ...] = ("b1b2", "f1", "n400")

# Live perception cues (raven-1) that subtly inform the officer mid-interview.
VISUAL_AWARENESS: list[str] = [
    "Is the applicant making eye contact with the camera?",
    "Does the applicant appear nervous, hesitant, or evasive right now?",
]

# Evaluated at call end to produce the post-interview demeanor debrief.
PERCEPTION_ANALYSIS: list[str] = [
    "Did the applicant maintain eye contact, or did they frequently look away?",
    "Did the applicant appear nervous, hesitant, or evasive at any point, and when?",
    "Assess the applicant's overall composure and confidence during the interview.",
]

# Appended to every officer's prompt: how to handle silence, and to keep repeat
# sessions from feeling identical.
SHARED_GUIDANCE = (
    "If the applicant is silent or does not answer, briefly repeat or rephrase the "
    "question once. If they still do not respond, acknowledge it and move on to the "
    "next question rather than waiting. Vary your exact wording and, where natural, "
    "the order in which you cover topics, so repeated interviews do not feel "
    "identical to the same applicant."
)


class PersonaSpec(BaseModel):
    """Static definition of one interviewer persona."""

    name: str
    greeting: str
    system_prompt: str
    hotwords: str
    visual_awareness_queries: list[str] = Field(default_factory=lambda: list(VISUAL_AWARENESS))
    perception_analysis_queries: list[str] = Field(default_factory=lambda: list(PERCEPTION_ANALYSIS))


class PersonaDeps(BaseModel):
    """Provisioned resource ids attached to a persona at creation time."""

    guardrail_ids: list[str] = Field(default_factory=list)
    objectives_id: str | None = None
    document_ids: list[str] = Field(default_factory=list)
    pronunciation_dictionary_id: str | None = None


SPECS: dict[VisaType, PersonaSpec] = {
    "b1b2": PersonaSpec(
        name="Consular Officer - Nonimmigrant Visa",
        greeting=(
            "Good morning. Please state your full name and the purpose of your "
            "visit to the United States."
        ),
        hotwords="USCIS, consular, visa, sponsor, employer, university, exchange, itinerary",
        system_prompt="""You are a U.S. consular officer conducting a nonimmigrant visa interview at a U.S. Embassy. You are professional, brisk, and neutral, not warm, not hostile. Real interviews last 2 to 4 minutes with rapid, direct questions.

Open by greeting the applicant briefly and asking the purpose of their trip to the United States. Then ask one concise question at a time, waiting for each full answer, moving roughly in this order: purpose of travel, the specifics of the trip or program, finances and who is paying, ties to the home country that ensure they will return, and any prior travel history.

The applicant's visa category is given in the conversation context; tailor your questions to it. For a work visa, probe the employer, the role, and the applicant's qualifications. For an exchange visa, probe the program and its sponsor. For a student visa, probe the school, funding, and intent to return after graduation. For a visitor visa, probe the itinerary, who is paying, and ties to home.

When an answer is vague, press once for specifics: names, numbers, dates. Keep your own responses to one sentence. Do not coach, explain, advise, or give feedback. Do not state whether the visa is approved. You are evaluating, not teaching. Never say "good answer." After roughly eight to ten questions, thank them and say the decision will follow. Do not break character.""",
    ),
    "f1": PersonaSpec(
        name="Consular Officer - Student Visa",
        greeting=(
            "Good morning. Please state your full name and the university you "
            "will be attending."
        ),
        hotwords="USCIS, consular, F-1, visa, university, sponsor, tuition, major",
        system_prompt="""You are a U.S. consular officer conducting an F-1 student visa interview at a U.S. Embassy. You are professional and focused. Your primary concerns are: (1) whether the applicant is a genuine student, (2) whether they can fund their education, and (3) whether they intend to return home after graduation. Interviews last 3 to 5 minutes.

Ask these questions one at a time, in roughly this order:
1. Why did you choose this university specifically?
2. What will you be studying?
3. What other universities did you apply to? Which ones accepted you?
4. How will you finance your education?
5. What does your sponsor do for work?
6. Why are you studying this in the U.S. rather than in your home country?
7. What do you plan to do after you graduate?
8. Do you have any family in the United States?

When an answer is vague, inconsistent, or suggests immigrant intent, ask one short follow-up. Keep your responses to one sentence. Do not coach, explain, advise, or give feedback. Do not break character.""",
    ),
    "n400": PersonaSpec(
        name="USCIS Officer - Naturalization",
        greeting=(
            "Good morning. Before we begin, please raise your right hand. Do you "
            "swear or affirm that the statements you will give today will be the "
            "truth, the whole truth, and nothing but the truth?"
        ),
        hotwords="USCIS, naturalization, N-400, oath, civics, Constitution, permanent resident",
        system_prompt="""You are a USCIS officer conducting an N-400 naturalization interview. This is more structured and slightly warmer than a consular interview, but still professional. Real interviews last 15 to 20 minutes; we will run an abbreviated version.

After the applicant confirms the oath, say: "Thank you, please put your hand down. Let's begin." Then proceed through these sections, one question at a time.

SECTION 1 - Identity:
- Please state your full legal name.
- What is your current address?
- What is your date of birth?

SECTION 2 - Eligibility and good moral character:
- How long have you been a lawful permanent resident?
- Since becoming a permanent resident, have you taken any trips outside the United States longer than six months?
- Have you ever been arrested, cited, or charged with any crime?
- Have you ever failed to file a federal tax return?
- Have you ever claimed to be a U.S. citizen?
- Have you ever registered to vote in any U.S. election?

SECTION 3 - Attachment to the Constitution:
- Do you support the Constitution and form of government of the United States?
- Are you willing to take the full Oath of Allegiance to the United States?

SECTION 4 - Civics test (ask 3 of these, one at a time):
- What is the supreme law of the land?
- What are the two major political parties in the United States?
- Name one branch of the U.S. government.
- Who is the current President of the United States?
- How many U.S. senators are there?

SECTION 5 - English:
Say: "Please read this sentence aloud: 'The President lives in the White House.'" Then: "Now, if I asked you to write 'Citizens can vote,' how would you say that back to me?"

Acknowledge answers briefly with "Thank you" or "Okay" but do not tell the applicant whether they got civics answers right. Do not coach or correct. Keep your responses short. Do not break character.""",
    ),
}

PersonaMap = dict[VisaType, str]


def build_persona_payload(
    spec: PersonaSpec, replica_id: str, llm_model: str, deps: PersonaDeps
) -> dict[str, Any]:
    """Assemble the full POST /v2/personas body for one interviewer."""
    layers: dict[str, Any] = {
        "llm": {"model": llm_model},
        "perception": {
            "perception_model": "raven-1",
            "visual_awareness_queries": spec.visual_awareness_queries,
            "perception_analysis_queries": spec.perception_analysis_queries,
        },
        "stt": {"stt_engine": "tavus-auto", "hotwords": spec.hotwords},
        "conversational_flow": {
            "turn_detection_model": "sparrow-1",
            # A real officer cuts off rambling answers; low patience + high interruptibility.
            "turn_taking_patience": "low",
            "replica_interruptibility": "high",
            # Re-engage a silent/idle applicant instead of waiting indefinitely.
            "idle_engagement": "eager",
        },
    }
    if deps.pronunciation_dictionary_id:
        layers["tts"] = {"pronunciation_dictionary_id": deps.pronunciation_dictionary_id}

    payload: dict[str, Any] = {
        "persona_name": spec.name,
        "system_prompt": f"{spec.system_prompt}\n\n{SHARED_GUIDANCE}",
        "pipeline_mode": "full",
        "default_replica_id": replica_id,
        "layers": layers,
    }
    if deps.guardrail_ids:
        payload["guardrail_ids"] = deps.guardrail_ids
    if deps.objectives_id:
        payload["objectives_id"] = deps.objectives_id
    if deps.document_ids:
        payload["document_ids"] = deps.document_ids
    return payload


async def _persona_exists(client: TavusClient, persona_id: str) -> bool:
    response = await client.request("GET", f"/personas/{persona_id}")
    if response.status_code == 200:
        return True
    if response.status_code == 404:
        return False
    raise TavusApiError(response.status_code, f"/personas/{persona_id}", response.text)


async def ensure_personas(
    client: TavusClient,
    replica_id: str,
    llm_model: str,
    deps_by_visa: dict[VisaType, PersonaDeps],
) -> PersonaMap:
    """Create or reuse one persona per visa type and return their ids.

    The persona is reused only when its full payload hash is unchanged and it
    still exists remotely; otherwise it is re-created, so edits to prompts, layers,
    or any attached dependency id take effect.
    """
    result: PersonaMap = {}
    for visa in VISA_TYPES:
        payload = build_persona_payload(SPECS[visa], replica_id, llm_model, deps_by_visa[visa])
        want_hash = cache.hash_spec(payload)

        async def create(_client: TavusClient, _key: str, *, _payload: dict[str, Any] = payload) -> str:
            created = await _client.request_json("POST", "/personas", json=_payload)
            return cache.extract_id(created, "persona_id", "id")

        result[visa] = await cache.ensure_resource(
            client,
            family="personas",
            key=visa,
            want_hash=want_hash,
            create=create,
            exists=_persona_exists,
        )
    return result
