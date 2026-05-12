# Asian Treasures

A simple static Pakistani fashion catalog that runs on GitHub Pages.

## How the Catalog Works

Create two levels of folders inside `catalog/`:

```text
catalog/
  clothes/
    emerald-embroidered-kurta/
      1.png
      2.png
      details.txt
  shoes/
    gold-khussa/
      1.svg
      details.txt
```

Each item folder should include images and a `details.txt` file:

```text
name: Emerald Embroidered Kurta
price: $79
size: S, M, L
color: Emerald
description: Elegant Pakistani kurta with embroidery.
```

`name`, `price`, and `description` get special styling. Any other fields are shown automatically.

The website gets the item name from `name:` in `details.txt`. If `name:` is missing, the catalog generator falls back to the folder name, so `emerald-embroidered-kurta` becomes `Emerald Embroidered Kurta`.

## Payment and Contact

Edit `config/payment.json` with your WhatsApp Business number or link:

```json
{
  "type": "WhatsApp",
  "label": "WhatsApp Business",
  "value": "+1 555 123 4567"
}
```

You can also use a direct WhatsApp link as the value.

## Updating Products

After adding or removing catalog folders, run:

```bash
python3 scripts/build_catalog.py
```

This updates `catalog.json`, which the static website reads in the browser.

New folders will not appear on the live site until `catalog.json` is regenerated, committed, and pushed.

## Old WordPress Import

The old WordPress site crawl is preserved in `Old_Website/`.

- `Old_Website/manifest.json` lists the crawled pages and downloaded images.
- `Old_Website/pages/` contains saved page HTML.
- `Old_Website/images/` contains downloaded WordPress images.
- `Old_Website/import_summary.json` lists the products imported into `catalog/`.

Importer scripts:

```bash
python3 scripts/crawl_old_website.py
python3 scripts/import_old_website_catalog.py --clean
python3 scripts/build_catalog.py
```

## GitHub Pages

Push this repository to GitHub, then enable Pages from the repository settings. Use:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/root`
Cloth store
