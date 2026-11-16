
import re
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# --------------------------------------------------
# 1. LOCATE THE GUIDELINE DOCUMENT
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]

GUIDELINE_PATH = (
    PROJECT_ROOT
    / "knowledge_base"
    / "guidelines"
    / "budgeting_guidelines.md"
)


# --------------------------------------------------
# 2. LOAD AND SPLIT DOCUMENT INTO CHUNKS
# --------------------------------------------------

def load_guideline_chunks():

    if not GUIDELINE_PATH.exists():
        raise FileNotFoundError(
            f"Guideline document not found: {GUIDELINE_PATH}"
        )

    content = GUIDELINE_PATH.read_text(encoding="utf-8")

    # Split the document at Markdown headings
    sections = re.split(r"(?=^#{1,3}\s)", content, flags=re.MULTILINE)

    chunks = []

    for section in sections:

        section = section.strip()

        if not section:
            continue

        # Extract section heading
        lines = section.splitlines()

        heading = lines[0].lstrip("#").strip()

        chunks.append({
            "heading": heading,
            "content": section
        })

    return chunks


# --------------------------------------------------
# 3. RETRIEVE RELEVANT GUIDELINES
# --------------------------------------------------

def retrieve_guidelines(query, top_k=3):

    if not isinstance(query, str) or not query.strip():
        raise ValueError("Query cannot be empty.")

    if not isinstance(top_k, int) or isinstance(top_k, bool) or top_k < 1:
        raise ValueError("top_k must be a positive integer.")

    chunks = load_guideline_chunks()

    documents = [
        chunk["content"]
        for chunk in chunks
    ]

    # Convert document chunks into TF-IDF vectors
    vectorizer = TfidfVectorizer(
        stop_words="english"
    )

    document_vectors = vectorizer.fit_transform(documents)

    # Convert user query into a vector
    query_vector = vectorizer.transform([query])

    # Calculate similarity
    scores = cosine_similarity(
        query_vector,
        document_vectors
    )[0]

    # Rank chunks by relevance
    ranked_indices = scores.argsort()[::-1]

    results = []

    for index in ranked_indices[:top_k]:

        score = float(scores[index])

        # Ignore sections with no matching terms
        if score <= 0:
            continue

        results.append({
            "heading": chunks[index]["heading"],
            "content": chunks[index]["content"],
            "similarity_score": round(score, 4)
        })

    return results


# --------------------------------------------------
# 4. TEST RETRIEVAL
# --------------------------------------------------

if __name__ == "__main__":

    question = "What happens when actual spending exceeds the budget?"

    retrieved = retrieve_guidelines(question)

    print("\nUSER QUESTION:")
    print(question)

    print("\nRETRIEVED GUIDELINES:")

    for result in retrieved:

        print("\nSection:", result["heading"])

        print(
            "Similarity:",
            result["similarity_score"]
        )

        print(result["content"])
