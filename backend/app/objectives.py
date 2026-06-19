"""Objective sets that drive a goal-oriented flow and extract structured data (feature #2).

Each visa type gets an objective set. Tavus runs an evaluator that verifies each
objective and collects `output_variables`, which is what lets us score an interview
(per-section completion, civics answers) instead of just transcribing it.
"""

from __future__ import annotations

import logging
from typing import Any

from . import cache
from .personas import VISA_TYPES, VisaType
from .tavus import TavusClient

logger = logging.getLogger(__name__)

# One list of objective definitions per visa type. Prompts describe outcomes
# ("Determine ...") rather than instructions ("Ask ...").
OBJECTIVES: dict[VisaType, list[dict[str, Any]]] = {
    "b1b2": [
        {
            "objective_name": "purpose_of_travel",
            "objective_prompt": "Determine the applicant's stated purpose of travel and intended length of stay.",
            "output_variables": ["purpose_of_travel", "length_of_stay"],
        },
        {
            "objective_name": "ties_to_home_country",
            "objective_prompt": "Determine whether the applicant demonstrated strong ties to their home country (job, property, family) that indicate they will return.",
            "output_variables": ["ties_strength", "ties_details"],
        },
        {
            "objective_name": "funding",
            "objective_prompt": "Determine who is funding the trip and whether the applicant could explain it clearly.",
            "output_variables": ["trip_funder"],
        },
    ],
    "f1": [
        {
            "objective_name": "genuine_student",
            "objective_prompt": "Determine whether the applicant is a genuine student who could explain their program and university choice.",
            "output_variables": ["program", "university", "genuine_student_assessment"],
        },
        {
            "objective_name": "financial_ability",
            "objective_prompt": "Determine whether the applicant can fund their education and explained their sponsor clearly.",
            "output_variables": ["funding_source", "sponsor_occupation"],
        },
        {
            "objective_name": "intent_to_return",
            "objective_prompt": "Determine whether the applicant showed intent to return home after graduation rather than immigrant intent.",
            "output_variables": ["post_graduation_plan", "intent_assessment"],
        },
    ],
    "h1b": [
        {
            "objective_name": "employer_verified",
            "objective_prompt": "Determine whether the U.S. employer is a real, operating business with a genuine need for the role.",
            "output_variables": ["employer", "employer_assessment"],
        },
        {
            "objective_name": "role_and_qualifications",
            "objective_prompt": "Determine whether the job is a specialty occupation and whether the applicant's degree and experience qualify them for it.",
            "output_variables": ["job_title", "degree", "qualification_assessment"],
        },
        {
            "objective_name": "compensation",
            "objective_prompt": "Confirm the offered salary and that it is consistent with the role.",
            "output_variables": ["salary"],
        },
    ],
    "j1": [
        {
            "objective_name": "program_and_sponsor",
            "objective_prompt": "Determine the exchange program, its category and dates, and its designated sponsor.",
            "output_variables": ["program", "sponsor"],
        },
        {
            "objective_name": "funding",
            "objective_prompt": "Determine how the exchange program is funded.",
            "output_variables": ["funding_source"],
        },
        {
            "objective_name": "intent_to_return",
            "objective_prompt": "Determine whether the applicant has plans and ties showing they will return home, including awareness of the two-year home-residency requirement (212(e)) if applicable.",
            "output_variables": ["return_plan", "intent_assessment"],
        },
    ],
    "n400": [
        {
            "objective_name": "identity_confirmed",
            "objective_prompt": "Confirm the applicant stated their full legal name, current address, and date of birth.",
            "output_variables": ["full_name", "identity_complete"],
        },
        {
            "objective_name": "good_moral_character",
            "objective_prompt": "Determine whether the applicant answered the eligibility and good-moral-character questions without disqualifying issues.",
            "output_variables": ["moral_character_flags"],
        },
        {
            "objective_name": "civics_test",
            "objective_prompt": "Score how many of the civics questions the applicant answered correctly out of those asked.",
            "output_variables": ["civics_correct", "civics_asked"],
        },
        {
            "objective_name": "english_test",
            "objective_prompt": "Determine whether the applicant demonstrated adequate spoken English for the reading and speaking checks.",
            "output_variables": ["english_assessment"],
        },
    ],
}


def link_chain(objectives: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Link objectives into a single linear chain.

    Tavus requires exactly one root objective (one not referenced by any other),
    so each objective points to the next via `next_required_objective`; the last
    has none. Returns new dicts, leaving the source SPECS untouched.
    """
    linked: list[dict[str, Any]] = []
    for index, objective in enumerate(objectives):
        item = dict(objective)
        if index + 1 < len(objectives):
            item["next_required_objective"] = objectives[index + 1]["objective_name"]
        linked.append(item)
    return linked


async def ensure_objectives(client: TavusClient) -> dict[VisaType, str]:
    """Create or reuse one objective set per visa type and return their ids."""
    result: dict[VisaType, str] = {}
    for visa in VISA_TYPES:
        objectives = link_chain(OBJECTIVES[visa])
        want_hash = cache.hash_spec(objectives)

        async def create(_client: TavusClient, _key: str, *, _objs: list[dict[str, Any]] = objectives) -> str:
            created = await _client.request_json("POST", "/objectives", json={"data": _objs})
            return cache.extract_id(created, "objectives_id", "id")

        result[visa] = await cache.ensure_resource(
            client, family="objectives", key=visa, want_hash=want_hash, create=create
        )
    return result
