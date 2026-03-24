"""
AI routing service with silent Ollama → Groq → Offline fallback.
Sends optimized PDF text to local Ollama. If it fails, falls back to Groq API.
If both AI providers fail, uses offline local table extraction (no LLM needed).
"""

import json
import logging
import os
import re
from collections import OrderedDict
import requests
from groq import Groq
from offline_extractor import extract_tables_offline

log = logging.getLogger(__name__)

# ─── Configuration ───────────────────────────────────────────────────────────

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "120"))  # seconds

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# ─── Prompt Template ────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert pharmaceutical data analyst.
You will receive raw text extracted from a **Pharmaceutical Distributor Stock & Sales Statement** PDF.

These documents are issued by medical distributors (e.g. drug agencies / pharma distributors) and contain
tabular stock movement data for pharmaceutical products. Common column headers include (but are not limited to):

  CODE, PRODUCT NAME, PACK/PACKING, OP.QTY (Opening Qty), RCPTS (Receipts),
  SALES, P.RETS (Purchase Returns), S.RETS (Sales Returns), CL.QTY (Closing Qty),
  CL.VAL (Closing Value), Ostk (Opening Stock), Purc (Purchases), Qoh (Qty on Hand),
  QohValue, Age, Reorder Qty, Dump Stock, Near Expiry, Company Name, etc.

YOUR TASK:
1. Extract ALL rows of tabular data. Use the EXACT original column headers from the document as JSON keys — do NOT rename them.
2. If the document groups products by company/division (e.g. "Company Name: ASTRAZENECA"), include a "Company" field in each row.
3. Generate 3-5 actionable business insights. Examples:
   - Items with zero closing quantity that had opening stock (potential stock-outs)
   - Items with high closing value but zero sales (dead stock)
   - Items with significant returns
   - Items nearing expiry or with old age
   - Top selling items by quantity

OUTPUT FORMAT — return ONLY this JSON (no markdown fences, no commentary):
{
  "insights": ["Insight 1", "Insight 2", "Insight 3"],
  "extracted_report": [
    {"Col1": "val", "Col2": "val", ...},
    {"Col1": "val", "Col2": "val", ...}
  ]
}

RULES:
- Keys in extracted_report MUST match the exact column headers from the document.
- **CRITICAL: The JSON keys in each row MUST appear in the same left-to-right order as the columns in the original document.** Do NOT sort keys alphabetically.
- Include EVERY data row.  Skip purely decorative/separator rows.
- insights must be professional and data-driven.
- Output ONLY the JSON object."""


def _build_user_prompt(text: str) -> str:
    return f"Here is the pharmaceutical stock & sales report text:\n\n{text}"


# ─── JSON Extraction Helper ─────────────────────────────────────────────────

def _extract_json(raw: str) -> dict:
    """
    Attempt to extract valid JSON from a raw LLM response.
    Handles cases where the model wraps JSON in markdown code fences.
    """
    # Try direct parse first
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Try to extract from markdown code fences
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try to find the first { ... } block
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError("Could not extract valid JSON from AI response")


# ─── Column Reordering ───────────────────────────────────────────────────────


def _normalize(s: str) -> str:
    """Lower-case, strip, collapse whitespace and dots for fuzzy matching."""
    return re.sub(r"[\s.]+", " ", s.strip().lower())


def _reorder_columns(rows: list[dict], pdf_column_order: list[str]) -> list[dict]:
    """
    Re-order the keys of every dict in *rows* so that they follow the
    same left-to-right column order as the original PDF.

    Uses fuzzy normalised matching (ignoring case, dots, extra spaces)
    to pair LLM keys with PDF headers.  LLM keys that don't match any
    PDF header are appended at the end.
    """
    if not rows or not pdf_column_order:
        return rows

    # Collect every unique key the LLM produced (preserving first-seen order)
    seen: set[str] = set()
    llm_keys: list[str] = []
    for row in rows:
        for k in row:
            if k not in seen:
                seen.add(k)
                llm_keys.append(k)

    # Build a normalised-form → LLM-key lookup
    norm_to_llm: dict[str, str] = {}
    for k in llm_keys:
        norm_to_llm[_normalize(k)] = k

    # Walk the PDF headers in order; match each to an LLM key
    ordered_keys: list[str] = []
    used: set[str] = set()
    for header in pdf_column_order:
        norm_h = _normalize(header)
        # Exact normalised match
        if norm_h in norm_to_llm:
            key = norm_to_llm[norm_h]
            if key not in used:
                ordered_keys.append(key)
                used.add(key)
            continue
        # Substring / contains match (PDF header inside LLM key or vice-versa)
        for norm_k, key in norm_to_llm.items():
            if key in used:
                continue
            if norm_h in norm_k or norm_k in norm_h:
                ordered_keys.append(key)
                used.add(key)
                break

    # Append any remaining LLM keys that didn't match a PDF header
    for k in llm_keys:
        if k not in used:
            ordered_keys.append(k)

    # Rebuild each row with the sorted key order
    return [OrderedDict((k, row.get(k, "")) for k in ordered_keys) for row in rows]


def _validate_response(data: dict) -> bool:
    """Validate that the response has the expected structure."""
    if not isinstance(data, dict):
        return False
    if "insights" not in data or "extracted_report" not in data:
        return False
    if not isinstance(data["insights"], list):
        return False
    if not isinstance(data["extracted_report"], list):
        return False
    return True


# ─── Ollama Client ───────────────────────────────────────────────────────────

def _call_ollama(text: str) -> dict:
    """Call the local Ollama instance. Raises on any failure."""
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(text)},
        ],
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 8192,
        },
    }

    response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
    response.raise_for_status()

    result = response.json()
    content = result.get("message", {}).get("content", "")

    parsed = _extract_json(content)
    if not _validate_response(parsed):
        raise ValueError("Ollama returned invalid response structure")

    return parsed


# ─── Groq Client ─────────────────────────────────────────────────────────────

def _call_groq(text: str) -> dict:
    """Call the Groq API as a fallback. Raises on any failure."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set")

    client = Groq(api_key=GROQ_API_KEY)

    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(text)},
        ],
        model=GROQ_MODEL,
        temperature=0.1,
        max_completion_tokens=8192,
        response_format={"type": "json_object"},
    )

    content = chat_completion.choices[0].message.content

    parsed = _extract_json(content)
    if not _validate_response(parsed):
        raise ValueError("Groq returned invalid response structure")

    return parsed


# ─── Public Interface ────────────────────────────────────────────────────────

def analyze_document(
    optimized_text: str,
    *,
    column_order: list[str] | None = None,
    file_bytes: bytes | None = None,
) -> dict:
    """
    Analyze the optimized PDF text using AI.
    Attempts local Ollama first, silently falls back to Groq, then to
    pure offline extraction (no LLM) as the final fallback.

    Args:
        optimized_text: Cleaned text extracted from the PDF.
        column_order:   Original column header order from the PDF table
                        (used to reorder LLM output to match the document).
        file_bytes:     Raw PDF bytes for offline table extraction fallback.

    Returns:
        dict with keys "insights" (list[str]) and "extracted_report" (list[dict])

    Raises:
        RuntimeError only if every method (including offline) fails.
    """
    result = None

    # Attempt 1: Local Ollama
    try:
        result = _call_ollama(optimized_text)
        log.info("✓ Analysis completed via Ollama (local)")
    except Exception as e:
        log.warning("Ollama failed: %s", e)

    # Attempt 2: Groq API Fallback
    if result is None:
        try:
            result = _call_groq(optimized_text)
            log.info("✓ Analysis completed via Groq (cloud)")
        except Exception as e:
            log.warning("Groq failed: %s", e)

    # Attempt 3: Offline extraction (no LLM, pure PyMuPDF table detection)
    if result is None and file_bytes:
        try:
            result = extract_tables_offline(file_bytes)
            log.info("✓ Analysis completed via offline extraction (no AI)")
        except Exception as e:
            log.warning("Offline extraction failed: %s", e)

    if result is None:
        raise RuntimeError(
            "All extraction methods failed. "
            "The PDF may not contain readable table data."
        )

    # Reorder columns to match the original PDF column order
    # (only needed for AI-generated results; offline already preserves order)
    if (
        result.get("extraction_mode") != "offline"
        and "extracted_report" in result
        and isinstance(result["extracted_report"], list)
    ):
        result["extracted_report"] = _reorder_columns(
            result["extracted_report"],
            column_order or [],
        )

    return result
