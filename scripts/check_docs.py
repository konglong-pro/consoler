from pathlib import Path
import os
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
ROOT_PATH_PREFIXES = (
    "AGENTS.md",
    "CONTEXT.md",
    "README.md",
    "package.json",
    "docs/",
    "scripts/",
    "packages/",
    "sdks/",
    "fixtures/",
    ".github/",
)
URL_PREFIXES = ("http://", "https://", "mailto:")


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def line_count(path: Path) -> int:
    return len(read(path).splitlines())


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def collect_manifest_paths(text: str) -> set[str]:
    paths: set[str] = set()
    for raw_line in text.splitlines():
        line = raw_line.split("#", 1)[0]
        for match in re.finditer(r"(?<![A-Za-z]:)(?:docs|scripts|packages|sdks|fixtures)/[^\s,\]\)\"']+", line):
            value = match.group(0).rstrip(":")
            paths.add(value)
    return paths


def current_blocks(text: str) -> dict[str, dict[str, str]]:
    blocks: dict[str, dict[str, str]] = {}
    in_current = False
    current_name: str | None = None
    for line in text.splitlines():
        if line == "current:":
            in_current = True
            continue
        if in_current and line and not line.startswith(" ") and not line.startswith("-"):
            break
        if not in_current:
            continue
        name_match = re.match(r"^  ([A-Za-z0-9_-]+):\s*$", line)
        if name_match:
            current_name = name_match.group(1)
            blocks[current_name] = {}
            continue
        value_match = re.match(r"^    ([A-Za-z0-9_-]+):\s*(.+?)\s*$", line)
        if current_name and value_match:
            blocks[current_name][value_match.group(1)] = value_match.group(2).strip("'\"")
    return blocks


def phase_blocks(text: str) -> dict[str, dict[str, str]]:
    blocks: dict[str, dict[str, str]] = {}
    in_phases = False
    current_name: str | None = None
    for line in text.splitlines():
        if line == "phases:":
            in_phases = True
            continue
        if not in_phases:
            continue
        name_match = re.match(r"^  ([A-Za-z0-9_.-]+):\s*$", line)
        if name_match:
            current_name = name_match.group(1)
            blocks[current_name] = {}
            continue
        value_match = re.match(r"^    ([A-Za-z0-9_-]+):\s*(.+?)\s*$", line)
        if current_name and value_match:
            blocks[current_name][value_match.group(1)] = value_match.group(2).strip("'\"")
    return blocks


def named_blocks(text: str, section_name: str) -> dict[str, dict[str, str]]:
    blocks: dict[str, dict[str, str]] = {}
    in_section = False
    current_name: str | None = None
    for line in text.splitlines():
        if line == f"{section_name}:":
            in_section = True
            continue
        if in_section and line and not line.startswith(" ") and not line.startswith("-"):
            break
        if not in_section:
            continue
        name_match = re.match(r"^  ([A-Za-z0-9_.-]+):\s*$", line)
        if name_match:
            current_name = name_match.group(1)
            blocks[current_name] = {}
            continue
        value_match = re.match(r"^    ([A-Za-z0-9_-]+):\s*(.+?)\s*$", line)
        if current_name and value_match:
            blocks[current_name][value_match.group(1)] = value_match.group(2).strip("'\"")
    return blocks


def has_front_matter(path: Path, required_status: str | None = None) -> bool:
    text = read(path)
    if not text.startswith("---\n"):
        return False
    end = text.find("\n---", 4)
    if end == -1:
        return False
    front = text[4:end]
    if "doc_type: phase_plan" not in front:
        return False
    if required_status and f"status: {required_status}" not in front:
        return False
    return True


def front_matter(path: Path) -> str | None:
    text = read(path)
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---", 4)
    if end == -1:
        return None
    return text[4:end]


def local_target_from_markdown_link(target: str) -> str | None:
    value = target.strip()
    if not value or value.startswith(URL_PREFIXES) or value.startswith("#"):
        return None
    if value.startswith("<") and ">" in value:
        value = value[1:value.index(">")]
    elif " " in value:
        value = value.split(None, 1)[0]
    value = value.split("#", 1)[0].split("?", 1)[0].strip()
    if not value or value.startswith(URL_PREFIXES) or value.startswith("#"):
        return None
    if "*" in value or re.match(r"^[A-Za-z]:[\\/]", value):
        return None
    return value


def local_target_from_code_span(value: str) -> str | None:
    target = value.strip().strip(".,;:")
    if not target or " " in target or "*" in target:
        return None
    if "/dist/" in target.replace("\\", "/"):
        return None
    if target.startswith(URL_PREFIXES) or re.match(r"^[A-Za-z]:[\\/]", target):
        return None
    if target.startswith(ROOT_PATH_PREFIXES):
        return target.split("#", 1)[0].split("?", 1)[0]
    return None


def resolve_local_target(source: Path, target: str) -> Path:
    if target.startswith(ROOT_PATH_PREFIXES):
        return ROOT / target
    return source.parent / target


def default_read_docs() -> list[Path]:
    files: list[Path] = [
        ROOT / "README.md",
        ROOT / "AGENTS.md",
        ROOT / "CONTEXT.md",
        ROOT / "docs" / "active" / "current.md",
        ROOT / "docs" / "project-status.md",
        ROOT / "docs" / "testing.md",
        ROOT / "docs" / "development.md",
        ROOT / "docs" / "architecture.md",
        ROOT / "docs" / "contracts" / "README.md",
        ROOT / "docs" / "testing" / "real-indbase-smokes.md",
        ROOT / "docs" / "planning" / "archive" / "README.md",
        ROOT / "docs" / "planning" / "next" / "README.md",
        ROOT / "docs" / "planning" / "superseded" / "README.md",
        ROOT / "docs" / "testing" / "archive" / "README.md",
        ROOT / "docs" / "agents" / "archive" / "README.md",
    ]
    for folder in [
        ROOT / "docs" / "contracts",
        ROOT / "docs" / "glossary",
        ROOT / "docs" / "agents" / "current",
        ROOT / "docs" / "planning" / "active",
        ROOT / "docs" / "planning" / "superseded",
    ]:
        if folder.exists():
            files.extend(path for path in folder.glob("*.md") if path.name.upper() != "README.MD")
    return sorted({path for path in files if path.exists()})


def check_links_in_default_docs(errors: list[str]) -> None:
    for path in default_read_docs():
        text = read(path)
        for match in re.finditer(r"(?<!!)\[[^\]]+\]\(([^)\n]+)\)", text):
            target = local_target_from_markdown_link(match.group(1))
            if not target:
                continue
            resolved = resolve_local_target(path, target)
            if not resolved.exists():
                fail(errors, f"{rel(path)} links to missing path: {target}")

        for match in re.finditer(r"`([^`\n]+)`", text):
            target = local_target_from_code_span(match.group(1))
            if not target:
                continue
            resolved = resolve_local_target(path, target)
            if not resolved.exists():
                fail(errors, f"{rel(path)} references missing path: {target}")


def strip_fenced_code(text: str) -> str:
    return re.sub(r"(?ms)^```.*?^```", "", text)


def archive_docs() -> list[Path]:
    files: list[Path] = []
    for folder in [
        ROOT / "docs" / "planning" / "archive",
        ROOT / "docs" / "testing" / "archive",
    ]:
        if folder.exists():
            files.extend(path for path in folder.rglob("*.md") if path.name.upper() != "README.MD")
    return sorted(files)


def archive_link_report() -> int:
    findings: list[str] = []
    checked = 0
    for path in archive_docs():
        checked += 1
        text = strip_fenced_code(read(path))
        for lineno, line in enumerate(text.splitlines(), start=1):
            for match in re.finditer(r"(?<!!)\[[^\]]+\]\(([^)\n]+)\)", line):
                target = local_target_from_markdown_link(match.group(1))
                if not target:
                    continue
                resolved = resolve_local_target(path, target)
                if not resolved.exists():
                    findings.append(f"{rel(path)}:{lineno} -> {target}")

            for match in re.finditer(r"`([^`\n]+)`", line):
                target = local_target_from_code_span(match.group(1))
                if not target:
                    continue
                resolved = resolve_local_target(path, target)
                if not resolved.exists():
                    findings.append(f"{rel(path)}:{lineno} -> {target}")

    print("Archive link audit report")
    print(f"- archive files checked: {checked}")
    print(f"- missing local targets: {len(findings)}")
    if findings:
        print("- findings:")
        for finding in findings[:200]:
            print(f"  - {finding}")
        if len(findings) > 200:
            print(f"  - ... {len(findings) - 200} more")
        print("Archive audit is report-only and does not fail the docs gate.")
    return 0


def main() -> int:
    if "--archive-report" in sys.argv[1:]:
        return archive_link_report()

    errors: list[str] = []

    agents = ROOT / "AGENTS.md"
    context = ROOT / "CONTEXT.md"
    manifest = ROOT / "docs" / "phase-manifest.yaml"

    if not agents.exists():
        fail(errors, "AGENTS.md is missing")
    elif line_count(agents) > 250:
        fail(errors, f"AGENTS.md has {line_count(agents)} lines; limit is 250")

    if not context.exists():
        fail(errors, "CONTEXT.md is missing")
    elif line_count(context) > 150:
        fail(errors, f"CONTEXT.md has {line_count(context)} lines; limit is 150")

    if not manifest.exists():
        fail(errors, "docs/phase-manifest.yaml is missing")
    else:
        manifest_text = read(manifest)
        for item in collect_manifest_paths(manifest_text):
            if not (ROOT / item).exists():
                fail(errors, f"manifest references missing path: {item}")

        blocks = current_blocks(manifest_text)
        if not blocks:
            fail(errors, "manifest has no current phase blocks")
        for name, block in blocks.items():
            if block.get("status") != "active":
                fail(errors, f"current.{name} status must be active")
            if not block.get("phase_id"):
                fail(errors, f"current.{name} missing phase_id")
            if not block.get("canonical_spec"):
                fail(errors, f"current.{name} missing canonical_spec")
            if not block.get("agent_rules"):
                fail(errors, f"current.{name} missing agent_rules")
            if not block.get("release_gate") or block.get("release_gate") in {"null", "None"}:
                fail(errors, f"current.{name} missing release_gate")

        phase_ids = [block.get("phase_id") for block in blocks.values() if block.get("phase_id")]
        if len(phase_ids) != len(set(phase_ids)):
            fail(errors, "multiple current projects point at the same active phase_id")

        phases = phase_blocks(manifest_text)
        active_phases = {
            phase_id
            for phase_id, block in phases.items()
            if block.get("status") == "active"
        }
        current_phase_ids = set(phase_ids)
        if active_phases != current_phase_ids:
            fail(
                errors,
                "active phases must match current phase ids "
                f"(current={sorted(current_phase_ids)}, phases={sorted(active_phases)})",
            )
        for phase_id in active_phases:
            if not phases.get(phase_id, {}).get("release_gate"):
                fail(errors, f"active phase {phase_id} missing release_gate")

        superseded = named_blocks(manifest_text, "superseded")
        for name, block in superseded.items():
            if block.get("status") != "superseded":
                fail(errors, f"superseded.{name} status must be superseded")
            record = block.get("record")
            if not record:
                fail(errors, f"superseded.{name} missing record")
            elif not (ROOT / record).exists():
                fail(errors, f"superseded.{name} record missing: {record}")

    if agents.exists():
        agents_text = read(agents)
        if re.search(r"docs/planning/archive/[^\s\)]*\.md", agents_text):
            fail(errors, "AGENTS.md directly references archived planning docs")

    check_links_in_default_docs(errors)

    planning_root = ROOT / "docs" / "planning"
    if planning_root.exists():
        for path in planning_root.glob("v*.md"):
            fail(errors, f"legacy phase plan must be archived, not root planning: {rel(path)}")

    scan_extensions = {".md", ".yaml", ".yml", ".json", ".mjs", ".ts", ".tsx", ".py"}
    skipped_dirs = {".git", "node_modules", "dist", "coverage", ".pytest_cache"}
    for current_root, dirs, files in os.walk(ROOT):
        dirs[:] = [name for name in dirs if name not in skipped_dirs]
        for filename in files:
            path = Path(current_root) / filename
            if path.suffix not in scan_extensions:
                continue
            text = read(path)
            if re.search(r"docs/planning/v[0-9][^\s\)\]`]*\.md", text):
                fail(errors, f"{rel(path)} references an unarchived planning path")
            if re.search(r"docs/testing/v[0-9][^\s\)\]`]*\.md", text):
                fail(errors, f"{rel(path)} references an unarchived testing path")

    active_dir = ROOT / "docs" / "planning" / "active"
    if active_dir.exists():
        for path in active_dir.glob("*.md"):
            if path.name.upper() == "README.MD":
                continue
            if not has_front_matter(path, "active"):
                fail(errors, f"{rel(path)} must have active phase_plan front matter")

    superseded_dir = ROOT / "docs" / "planning" / "superseded"
    if superseded_dir.exists():
        for path in superseded_dir.glob("*.md"):
            if path.name.upper() == "README.MD":
                continue
            front = front_matter(path)
            if not front:
                fail(errors, f"{rel(path)} must have superseded front matter")
                continue
            if "status: superseded" not in front:
                fail(errors, f"{rel(path)} must declare status: superseded")
            if "read_by_default: false" not in front:
                fail(errors, f"{rel(path)} must declare read_by_default: false")
            if "superseded_by:" not in front:
                fail(errors, f"{rel(path)} must declare superseded_by")

    archive_dir = ROOT / "docs" / "planning" / "archive"
    if archive_dir.exists():
        for path in archive_dir.rglob("*.md"):
            if path.name.upper() == "README.MD":
                continue
            front = front_matter(path)
            if not front:
                fail(errors, f"{rel(path)} must have archive phase_plan front matter")
                continue
            if not re.search(r"doc_type: (phase_plan|closeout_summary)", front):
                fail(errors, f"{rel(path)} must declare doc_type: phase_plan or closeout_summary")
            if "read_by_default: false" not in front:
                fail(errors, f"{rel(path)} must declare read_by_default: false")
            if "canonical: false" not in front:
                fail(errors, f"{rel(path)} must declare canonical: false")
            if not re.search(r"status: (completed|frozen|archived)", front):
                fail(errors, f"{rel(path)} must use completed, frozen, or archived status")

    testing_root = ROOT / "docs" / "testing"
    if testing_root.exists():
        for path in testing_root.glob("v*.md"):
            fail(errors, f"phase testing evidence must be archived, not root testing: {rel(path)}")

    testing_archive_dir = ROOT / "docs" / "testing" / "archive"
    if testing_archive_dir.exists():
        for path in testing_archive_dir.rglob("*.md"):
            if path.name.upper() == "README.MD":
                continue
            front = front_matter(path)
            if not front:
                fail(errors, f"{rel(path)} must have testing_evidence front matter")
                continue
            if "doc_type: testing_evidence" not in front:
                fail(errors, f"{rel(path)} must declare doc_type: testing_evidence")
            if "read_by_default: false" not in front:
                fail(errors, f"{rel(path)} must declare read_by_default: false")
            if "canonical: false" not in front:
                fail(errors, f"{rel(path)} must declare canonical: false")
            if not re.search(r"status: (completed|frozen|archived)", front):
                fail(errors, f"{rel(path)} must use completed, frozen, or archived status")

    if errors:
        print("Documentation lint failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Documentation lint passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
