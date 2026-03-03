#!/usr/bin/env python3
"""
Update results.json by replacing the opus run with data from the new archive.

- Reads summary.json from the archive
- Extracts test_results from grade_result.json files
- Parses llm_grade scores from llm_grade_result.txt files
- Recalculates scores for LLM-graded courses
- Adds COMP 318 to courses
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ARCHIVE = Path(__file__).parent.parent / "data" / "archive-20260302-190627.tar.gz"
RESULTS = Path(__file__).parent.parent / "data" / "results.json"
ARCHIVE_PREFIX = "archive-20260302-190627"


def tar_extract(path_in_archive: str) -> str:
    result = subprocess.run(
        ["tar", "-xzf", str(ARCHIVE), "--to-stdout", path_in_archive],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise FileNotFoundError(path_in_archive)
    return result.stdout


def tar_list(pattern: str) -> list[str]:
    result = subprocess.run(
        f'tar -tzf "{ARCHIVE}" | grep "{pattern}"',
        shell=True, capture_output=True, text=True,
    )
    if result.returncode != 0:
        return []
    return [l for l in result.stdout.strip().split("\n") if l]


def parse_llm_grade(text: str) -> dict | None:
    """Parse Total: X/Y from llm_grade_result.txt."""
    match = re.search(r"Total:\s*([\d.]+)\s*/\s*([\d.]+)", text)
    if not match:
        return None
    earned = float(match.group(1))
    possible = float(match.group(2))
    return {
        "status": "graded",
        "feedback": text,
        "points_earned": earned,
        "points_possible": possible,
        "score_percentage": (earned / possible * 100) if possible > 0 else 0,
    }


def map_test_results(tests: list[dict]) -> list[dict]:
    """Map grade_result.json test format to results.json format."""
    return [
        {
            "test_name": t["name"],
            "status": "pass" if t.get("passed") else "fail",
            "points_earned": t.get("points", 0),
            "points_possible": t.get("max_points", 0),
            "input_description": t.get("input"),
            "expected": t.get("expected"),
            "actual": t.get("actual"),
            "error_message": t.get("error"),
            "traceback": None,
            "execution_time_ms": t.get("time", 0),
        }
        for t in tests
    ]


def map_grade_test_results(tests: list[dict]) -> list[dict]:
    """Map summary.json grade.test_results format to results.json format."""
    return [
        {
            "test_name": t["name"],
            "status": "pass" if t.get("passed") else "fail",
            "points_earned": t.get("points", 0),
            "points_possible": t.get("max_points", 0),
            "input_description": None,
            "expected": t.get("expected"),
            "actual": t.get("actual"),
            "error_message": t.get("error"),
            "traceback": None,
            "execution_time_ms": 0,
        }
        for t in tests
    ]


def main():
    # Load new summary
    summary_raw = tar_extract(f"{ARCHIVE_PREFIX}/summary.json")
    summary = json.loads(summary_raw)

    # Load existing results.json
    results = json.loads(RESULTS.read_text())

    # --- Extract grade_result.json files ---
    grade_files = tar_list(r"grade_result\.json$")
    grade_data = {}
    for gf in grade_files:
        parts = gf.split("/")
        ws_idx = parts.index("workspaces")
        ws_id = parts[ws_idx + 1]
        try:
            raw = tar_extract(gf)
            grade_data[ws_id] = json.loads(raw)
        except Exception:
            pass
    print(f"Extracted {len(grade_data)} grade_result.json files")

    # --- Extract llm_grade_result.txt files ---
    llm_files = tar_list(r"llm_grade_result\.txt$")
    llm_grades = {}
    for lf in llm_files:
        parts = lf.split("/")
        ws_idx = parts.index("workspaces")
        ws_id = parts[ws_idx + 1]
        try:
            text = tar_extract(lf)
            parsed = parse_llm_grade(text)
            if parsed:
                llm_grades[ws_id] = parsed
        except Exception:
            pass
    print(f"Parsed {len(llm_grades)} llm_grade scores")

    # --- Build updated workspace entries ---
    workspaces = {}
    for ws_id, ws in summary["workspaces"].items():
        entry = {
            "id": ws["id"],
            "course": ws["course"],
            "language": ws["language"],
            "assignment_number": ws["assignment_number"],
            "display_name": ws["display_name"],
            "cost_usd": ws["cost_usd"],
            "input_tokens": ws["input_tokens"],
            "output_tokens": ws["output_tokens"],
            "cache_creation_tokens": ws["cache_creation_tokens"],
            "cache_read_tokens": ws["cache_read_tokens"],
            "duration_ms": ws["duration_ms"],
            "duration_api_ms": ws["duration_api_ms"],
            "num_turns": ws["num_turns"],
            "session_id": ws["session_id"],
            "model_id": ws["model_id"],
            "grade": ws.get("grade"),
            "grade_summary": ws.get("grade_summary"),
            "llm_grade": llm_grades.get(ws_id),
        }

        # Add test_results: prefer grade_result.json (richer), fall back to grade.test_results
        if ws_id in grade_data:
            gd = grade_data[ws_id]
            if "test_results" in gd:
                # COMP 140 format: already in target schema
                entry["test_results"] = gd["test_results"]
            else:
                # Other courses: "tests" key with different field names
                entry["test_results"] = map_test_results(gd.get("tests", []))
        elif ws.get("grade") and ws["grade"].get("test_results"):
            entry["test_results"] = map_grade_test_results(ws["grade"]["test_results"])

        # Clean grade — remove nested test_results (it's now at workspace level)
        if entry["grade"] and "test_results" in entry["grade"]:
            entry["grade"] = {k: v for k, v in entry["grade"].items() if k != "test_results"}

        workspaces[ws_id] = entry

    # --- Recalculate scores for LLM-graded assignments ---
    scores = summary["scores"]
    for ws_id, ws in workspaces.items():
        llm = ws.get("llm_grade")
        grade = ws.get("grade")

        if llm and llm["points_possible"] > 0:
            llm_pct = llm["points_earned"] / llm["points_possible"] * 100
        else:
            llm_pct = None

        if grade and grade.get("points_possible", 0) > 0:
            code_pct = grade["score_percentage"]
        else:
            code_pct = None

        # Combine: if both code and written, average them; otherwise use whichever exists
        if code_pct is not None and llm_pct is not None:
            combined = (code_pct + llm_pct) / 2
        elif llm_pct is not None:
            combined = llm_pct
        elif code_pct is not None:
            combined = code_pct
        else:
            combined = 0.0

        # Cap at 100
        combined = min(combined, 100.0)
        scores["assignments"][ws_id] = {"pct": round(combined, 2), "weight": 1}

    # Recalculate course scores
    courses_ws = {}
    for ws_id, ws in workspaces.items():
        c = ws["course"]
        if c not in courses_ws:
            courses_ws[c] = []
        courses_ws[c].append(ws_id)

    LETTER_SCALE = [
        (93, "A"), (90, "A-"), (87, "B+"), (83, "B"), (80, "B-"),
        (77, "C+"), (73, "C"), (70, "C-"), (67, "D+"), (63, "D"),
        (60, "D-"), (0, "F"),
    ]

    def to_letter(pct):
        for threshold, letter in LETTER_SCALE:
            if pct >= threshold:
                return letter
        return "F"

    GPA_MAP = {
        "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
        "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "D-": 0.7, "F": 0.0,
    }

    for course_id, ws_ids in courses_ws.items():
        pcts = [scores["assignments"][ws_id]["pct"] for ws_id in ws_ids]
        avg = sum(pcts) / len(pcts) if pcts else 0
        letter = to_letter(avg)
        scores["courses"][course_id] = {
            "grade": round(avg, 2),
            "letter": letter,
            "credit_hours": 3,
        }

    # Recalculate by_course totals
    by_course = {}
    for course_id, ws_ids in courses_ws.items():
        wss = [workspaces[wid] for wid in ws_ids]
        tests_passed = sum((ws["grade"]["tests_passed"] if ws.get("grade") else 0) for ws in wss)
        tests_total = sum((ws["grade"]["tests_total"] if ws.get("grade") else 0) for ws in wss)
        by_course[course_id] = {
            "workspaces": len(wss),
            "cost_usd": sum(ws["cost_usd"] for ws in wss),
            "duration_ms": sum(ws["duration_ms"] for ws in wss),
            "tests_passed": tests_passed,
            "tests_total": tests_total,
        }

    # Overall scores
    all_course_scores = scores["courses"]
    total_weighted = sum(cs["grade"] * cs["credit_hours"] for cs in all_course_scores.values())
    total_hours = sum(cs["credit_hours"] for cs in all_course_scores.values())
    overall = round(total_weighted / total_hours, 2) if total_hours > 0 else 0
    overall_letter = to_letter(overall)
    gpa = round(
        sum(GPA_MAP.get(cs["letter"], 0) * cs["credit_hours"] for cs in all_course_scores.values()) / total_hours,
        2,
    ) if total_hours > 0 else 0

    scores["overall"] = overall
    scores["overall_letter"] = overall_letter
    scores["gpa"] = gpa

    # --- Build the new run ---
    new_run = {
        "run_metadata": summary["run_metadata"],
        "workspaces": workspaces,
        "totals": summary["totals"],
        "by_course": by_course,
        "scores": scores,
    }

    # --- Update results.json ---
    # Replace opus run (index 0)
    opus_idx = None
    for i, run in enumerate(results["runs"]):
        if run["run_metadata"]["model"] == "opus":
            opus_idx = i
            break

    if opus_idx is None:
        print("ERROR: Could not find opus run in results.json")
        sys.exit(1)

    results["runs"][opus_idx] = new_run

    # Add COMP 318 to courses if not present
    if "comp318" not in results["courses"]:
        results["courses"]["comp318"] = {
            "id": "comp318",
            "displayName": "COMP 318",
            "title": "Databases",
            "language": "java",
            "totalAssignments": 2,
            "totalTests": 184,
        }
        print("Added COMP 318 to courses")

    # Update lastUpdated
    results["lastUpdated"] = "2026-03-02"

    # Write
    RESULTS.write_text(json.dumps(results, indent=2) + "\n")
    print(f"Updated results.json with new opus run ({len(workspaces)} workspaces)")
    print(f"Overall: {overall}% ({overall_letter}), GPA: {gpa}")

    # Print course breakdown
    for cid in sorted(all_course_scores):
        cs = all_course_scores[cid]
        print(f"  {cid}: {cs['grade']}% ({cs['letter']})")


if __name__ == "__main__":
    main()
