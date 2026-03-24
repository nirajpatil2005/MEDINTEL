"""
PDF text extraction and token optimization using PyMuPDF (fitz).
Implements hard page limits and text cleaning for LLM context windows.
"""

import fitz  # PyMuPDF
import hashlib
import re
import unicodedata

MAX_PAGES = 20  # Hard limit for large/messy PDFs


def compute_file_hash(file_bytes: bytes) -> str:
    """Compute SHA-256 hash of the raw PDF bytes."""
    return hashlib.sha256(file_bytes).hexdigest()


def clean_text(text: str) -> str:
    """
    Strip excessive whitespace, repetitive newlines, and invisible unicode
    characters WITHOUT altering actual alphanumeric column names.
    """
    # Remove non-printable / invisible unicode characters (zero-width spaces, etc.)
    # but keep standard printable chars, tabs, newlines, and common symbols.
    cleaned = ""
    for ch in text:
        cat = unicodedata.category(ch)
        # Keep letters, numbers, punctuation, symbols, separators (space),
        # and standard control characters like \n and \t
        if cat.startswith(("L", "N", "P", "S", "Z")) or ch in ("\n", "\t", "\r"):
            cleaned += ch
    text = cleaned

    # Collapse multiple spaces/tabs into a single space (per line).
    text = re.sub(r"[^\S\n]+", " ", text)

    # Collapse 3+ consecutive newlines into 2.
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Strip leading/trailing whitespace from each line.
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(lines)

    # Remove completely empty lines that add no value.
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def _extract_table_headers(doc: fitz.Document, total_pages: int) -> list[str]:
    """
    Scan the first few pages for a table and return its header row
    (the first row of the first table found), preserving left-to-right order.
    Returns an empty list if no table is detected.
    """
    for page_num in range(min(total_pages, 3)):  # check first 3 pages max
        page = doc[page_num]
        try:
            tables = page.find_tables()
            if tables and len(tables.tables) > 0:
                table = tables[0]  # first table on the page
                rows = table.extract()
                if rows and len(rows) > 0:
                    # First row is the header
                    headers = [
                        str(cell).strip()
                        for cell in rows[0]
                        if cell is not None and str(cell).strip()
                    ]
                    if len(headers) >= 3:  # must look like a real table
                        return headers
        except Exception:
            continue
    return []


def extract_text_from_pdf(file_bytes: bytes) -> dict:
    """
    Extract and optimize text from a PDF file.
    Processes up to MAX_PAGES pages and cleans the text for LLM consumption.

    Returns:
        dict with keys: text, page_count, char_count, column_order
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    total_pages = min(len(doc), MAX_PAGES)

    # Extract the original column order from the PDF table
    column_order = _extract_table_headers(doc, total_pages)

    raw_text_parts = []
    for page_num in range(total_pages):
        page = doc[page_num]
        page_text = page.get_text("text")
        if page_text and page_text.strip():
            raw_text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")

    doc.close()

    full_text = "\n\n".join(raw_text_parts)
    optimized_text = clean_text(full_text)

    return {
        "text": optimized_text,
        "page_count": total_pages,
        "char_count": len(optimized_text),
        "column_order": column_order,
    }
