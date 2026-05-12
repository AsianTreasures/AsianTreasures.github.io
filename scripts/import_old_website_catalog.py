from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import html
import json
import re
import shutil
import sys
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / "Old_Website"
CATALOG = ROOT / "catalog"
API = "https://public-api.wordpress.com/wp/v2/sites/asiantreasures.wordpress.com/pages?per_page=100"
USER_AGENT = "AsianTreasuresCatalogImporter/1.0"
IMPORTED_BRAND_SLUGS = {"beechtree", "ethnic", "limelight", "other", "pre-orders"}

SKIP_SLUGS = {
    "contact",
    "home",
    "home2",
    "luxury",
    "payment-block-media-and-text",
    "pre-orders",
    "product-story",
    "sliding-images",
    "store",
}

BRAND_ALIASES = {
    "beech tree": "Beechtree",
    "beechtree": "Beechtree",
    "ethnc": "Ethnic",
    "ethnic": "Ethnic",
    "lime light": "Limelight",
    "limelight": "Limelight",
    "limelight casual": "Limelight",
    "pre order": "Pre Orders",
    "pre orders": "Pre Orders",
}


class ContentParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.current = None
        self.blocks = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        tag = tag.lower()
        self.stack.append(tag)
        if tag in {"h1", "h2", "h3", "p", "li"}:
            self.current = {"tag": tag, "text": []}
        if tag == "br" and self.current:
            self.current["text"].append("\n")
        if tag == "img":
            src = attrs.get("data-orig-file") or attrs.get("src")
            if src:
                self.images.append(html.unescape(src))

    def handle_endtag(self, tag):
        tag = tag.lower()
        if self.current and self.current["tag"] == tag:
            text = clean_text("".join(self.current["text"]))
            if text:
                self.blocks.append({"tag": tag, "text": text})
            self.current = None
        if self.stack:
            self.stack.pop()

    def handle_data(self, data):
        if self.current:
            self.current["text"].append(data)


def fetch_json(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=45) as response:
        return json.load(response)


def fetch_bytes(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=45) as response:
        return response.read()


def clean_text(value):
    value = html.unescape(value or "")
    value = value.replace("\xa0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n\s+", "\n", value)
    return value.strip()


def clean_size(value):
    value = re.sub(r"\s*\bsold\b", "", value, flags=re.I)
    value = re.sub(r"\s*,\s*,", ",", value)
    value = re.sub(r"\s+,", ",", value)
    return value.rstrip(", ").strip()


def slugify(value):
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "item"


def normalize_brand(value):
    value = clean_text(value).strip(" :")
    if not value:
        return "Other"
    return BRAND_ALIASES.get(value.lower(), value.title())


def first_price(blocks):
    for block in blocks:
        text = block["text"]
        if re.search(r"\$\s*\d", text) or text.lower() == "sold":
            return text
    return ""


def first_product_name(blocks):
    for block in blocks:
        text = block["text"]
        lowered = text.lower()
        if block["tag"] in {"h1", "h2", "h3"} and text and not text.startswith("$") and "home/" not in lowered:
            if text.lower() not in {"asian treasures", "beechtree", "limelight", "ethnic", "others"}:
                return text
    return ""


def details_from_blocks(blocks):
    details = {}
    description_parts = []

    for block in blocks:
        text = block["text"]
        if ":" in text:
            # Product details are often stored as one paragraph with br-separated key/value lines.
            for line in text.split("\n"):
                line = clean_text(line)
                if ":" not in line:
                    continue
                key, value = line.split(":", 1)
                key = slugify(key).replace("-", "_")
                value = clean_text(value)
                if key and value and key not in {"description", "product_details", "shipping"}:
                    details[key] = value
        elif block["tag"] == "p":
            lowered = text.lower()
            if lowered not in {"description", "product details", "shipping"} and not lowered.startswith("shipping will"):
                description_parts.append(text)

    if description_parts:
        details["description"] = " ".join(description_parts)
    return details


def old_image_path(url):
    parsed = urllib.parse.urlparse(url)
    parts = [part for part in parsed.path.strip("/").split("/") if part]
    candidates = []
    if len(parts) >= 4 and parts[0] == "wp-content" and parts[1] == "uploads":
        candidates.append(OLD / "images" / Path(*parts[2:]))
    name = Path(parsed.path).name
    if name:
        candidates.extend((OLD / "images").glob(f"**/{name}"))
        # WordPress often has edited/original filename variants.
        base = re.sub(r"-edited(?=\.)", "", name)
        base = re.sub(r"-edited-\d+(?=\.)", "", base)
        candidates.extend((OLD / "images").glob(f"**/{base}"))
        stem, suffix = Path(base).stem, Path(base).suffix
        relaxed_stem = re.sub(r"-\d+$", "", stem)
        candidates.extend((OLD / "images").glob(f"**/{relaxed_stem}*{suffix}"))
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def download_missing_image(url):
    parsed = urllib.parse.urlparse(url)
    name = Path(parsed.path).name or "image.jpg"
    target = OLD / "images" / "_api_missing" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_bytes(fetch_bytes(url))
    return target


def unique_path(path):
    if not path.exists():
        return path
    parent, stem, suffix = path.parent, path.stem, path.suffix
    counter = 2
    while True:
        candidate = parent / f"{stem}-{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def write_details(path, details):
    order = ["name", "price", "brand", "status", "description"]
    lines = []
    for key in order:
        if details.get(key):
            lines.append(f"{key}: {details[key]}")
    for key in sorted(k for k in details if k not in order):
        lines.append(f"{key}: {details[key]}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    clean = "--clean" in sys.argv
    if clean:
        for slug in IMPORTED_BRAND_SLUGS:
            path = CATALOG / slug
            if path.exists():
                shutil.rmtree(path)

    pages = fetch_json(API)
    products = []
    for page in pages:
        slug = page.get("slug", "")
        if slug in SKIP_SLUGS:
            continue
        parser = ContentParser()
        parser.feed(page.get("content", {}).get("rendered", ""))
        blocks = parser.blocks
        price = first_price(blocks)
        name = first_product_name(blocks)
        if not name or not price or not parser.images:
            continue

        details = details_from_blocks(blocks)
        brand = normalize_brand(details.get("brand", "Other"))
        status = "Sold" if price.lower() == "sold" else ""
        item_details = {
            "name": name,
            "price": price,
            "brand": brand,
            "status": status,
            **details,
        }
        if "what_you_ll_get" in item_details:
            item_details["what_you_will_get"] = item_details.pop("what_you_ll_get")
        if "size" in item_details:
            item_details["size"] = clean_size(item_details["size"])
        item_details["brand"] = brand

        products.append(
            {
                "slug": slug,
                "name": name,
                "brand": brand,
                "details": item_details,
                "images": parser.images,
            }
        )

    imported = []
    skipped_images = []
    for product in products:
        category_dir = CATALOG / slugify(product["brand"])
        item_dir = unique_path(category_dir / slugify(product["name"]))
        item_dir.mkdir(parents=True, exist_ok=True)

        copied = 0
        seen_sources = set()
        for image_url in product["images"]:
            if image_url in seen_sources:
                continue
            seen_sources.add(image_url)
            source = old_image_path(image_url)
            if not source:
                try:
                    source = download_missing_image(image_url)
                except Exception as exc:
                    skipped_images.append({"product": product["slug"], "image": image_url, "error": f"{type(exc).__name__}: {exc}"})
                    continue
            suffix = source.suffix.lower() or ".jpg"
            destination = item_dir / f"{copied + 1}{suffix}"
            shutil.copy2(source, destination)
            copied += 1

        if copied == 0:
            shutil.rmtree(item_dir)
            continue

        write_details(item_dir / "details.txt", product["details"])
        imported.append({"source_slug": product["slug"], "name": product["name"], "brand": product["brand"], "images": copied})

    summary = {"imported_count": len(imported), "skipped_images": skipped_images, "items": imported}
    (OLD / "import_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({"imported_count": len(imported), "skipped_image_count": len(skipped_images)}, indent=2))


if __name__ == "__main__":
    main()
