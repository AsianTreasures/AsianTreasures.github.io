from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import json
import re
import time
import xml.etree.ElementTree as ET

SITE = "https://asiantreasures.wordpress.com"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Old_Website"
PAGES = OUT / "pages"
IMAGES = OUT / "images"
USER_AGENT = "AsianTreasuresCatalogCrawler/1.0"


class TitleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title_parts = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)

    @property
    def title(self):
        return " ".join(part.strip() for part in self.title_parts if part.strip())


def fetch(url):
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=45) as response:
        return response.read(), response.headers.get_content_type()


def slug_for_url(url):
    parsed = urlparse(url)
    slug = parsed.path.strip("/").replace("/", "-")
    if not slug:
        slug = "home"
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", slug).strip("-").lower()


def local_image_path(url):
    parsed = urlparse(url)
    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if len(parts) >= 4 and parts[0] == "wp-content" and parts[1] == "uploads":
        rel = Path(*parts[2:])
    else:
        rel = Path(slug_for_url(url))
    return IMAGES / rel


def parse_sitemap(xml_bytes):
    root = ET.fromstring(xml_bytes)
    ns = {
        "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
        "image": "http://www.google.com/schemas/sitemap-image/1.1",
    }
    entries = []
    seen = set()
    for url_node in root.findall("sm:url", ns):
        loc = url_node.findtext("sm:loc", default="", namespaces=ns).strip()
        if not loc:
            continue
        canonical = loc.rstrip("/") or loc
        if canonical in seen:
            continue
        seen.add(canonical)
        images = []
        for image_node in url_node.findall("image:image", ns):
            image_loc = image_node.findtext("image:loc", default="", namespaces=ns).strip()
            image_title = image_node.findtext("image:title", default="", namespaces=ns).strip()
            image_caption = image_node.findtext("image:caption", default="", namespaces=ns).strip()
            if image_loc:
                images.append({"url": image_loc, "title": image_title, "caption": image_caption})
        entries.append(
            {
                "url": loc,
                "slug": slug_for_url(loc),
                "lastmod": url_node.findtext("sm:lastmod", default="", namespaces=ns).strip(),
                "images": images,
            }
        )
    return entries


def page_title(html_bytes):
    parser = TitleParser()
    try:
        parser.feed(html_bytes.decode("utf-8", errors="ignore"))
    except Exception:
        return ""
    return parser.title


def main():
    OUT.mkdir(exist_ok=True)
    PAGES.mkdir(exist_ok=True)
    IMAGES.mkdir(exist_ok=True)

    sitemap_bytes, _ = fetch(f"{SITE}/sitemap.xml")
    (OUT / "sitemap.xml").write_bytes(sitemap_bytes)
    entries = parse_sitemap(sitemap_bytes)

    image_index = {}
    for entry in entries:
        page_dir = PAGES / entry["slug"]
        page_dir.mkdir(parents=True, exist_ok=True)
        try:
            html_bytes, content_type = fetch(entry["url"])
            (page_dir / "index.html").write_bytes(html_bytes)
            entry["title"] = page_title(html_bytes)
            entry["content_type"] = content_type
            entry["html_file"] = str((page_dir / "index.html").relative_to(OUT))
        except Exception as exc:
            entry["error"] = f"{type(exc).__name__}: {exc}"

        for image in entry["images"]:
            image_path = local_image_path(image["url"])
            image["file"] = str(image_path.relative_to(OUT))
            image_index.setdefault(image["url"], image_path)

        (page_dir / "metadata.json").write_text(json.dumps(entry, indent=2), encoding="utf-8")
        time.sleep(0.1)

    downloaded = []
    failed = []
    for url, image_path in sorted(image_index.items()):
        image_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            if not image_path.exists():
                data, content_type = fetch(url)
                image_path.write_bytes(data)
            else:
                content_type = "existing"
            downloaded.append({"url": url, "file": str(image_path.relative_to(OUT)), "content_type": content_type})
        except Exception as exc:
            failed.append({"url": url, "file": str(image_path.relative_to(OUT)), "error": f"{type(exc).__name__}: {exc}"})
        time.sleep(0.05)

    manifest = {
        "site": SITE,
        "page_count": len(entries),
        "image_count": len(image_index),
        "downloaded_image_count": len(downloaded),
        "failed_image_count": len(failed),
        "pages": entries,
        "downloaded_images": downloaded,
        "failed_images": failed,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({k: manifest[k] for k in ["page_count", "image_count", "downloaded_image_count", "failed_image_count"]}, indent=2))


if __name__ == "__main__":
    main()
