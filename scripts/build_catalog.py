from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "catalog"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}


def title_from_slug(slug):
    return slug.replace("-", " ").replace("_", " ").title()


def parse_details(path):
    details = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        details[key.strip().lower().replace(" ", "_")] = value.strip()
    return details


def dirs(path):
    if not path.exists():
        return []
    return sorted(child for child in path.iterdir() if child.is_dir())


catalog = []
for category in dirs(CATALOG):
    items = []
    for item in dirs(category):
        details_path = item / "details.txt"
        images = [
            str(image.relative_to(ROOT)).replace("\\", "/")
            for image in sorted(item.iterdir())
            if image.suffix.lower() in IMAGE_EXTENSIONS
        ]
        items.append(
            {
                "slug": item.name,
                "path": str(item.relative_to(ROOT)).replace("\\", "/"),
                "images": images,
                "details": parse_details(details_path)
                if details_path.exists()
                else {"name": title_from_slug(item.name)},
            }
        )

    catalog.append({"slug": category.name, "name": title_from_slug(category.name), "items": items})

(ROOT / "catalog.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
print(f"Wrote catalog.json with {sum(len(category['items']) for category in catalog)} items.")
