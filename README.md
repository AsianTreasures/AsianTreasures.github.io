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

## Payment and Contact

Edit `config/payment.json` to add Zelle, phone, email, SMS, or WhatsApp contact methods.

## Updating Products

After adding or removing catalog folders, run:

```bash
python3 scripts/build_catalog.py
```

This updates `catalog.json`, which the static website reads in the browser.

## GitHub Pages

Push this repository to GitHub, then enable Pages from the repository settings. Use:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/root`
Cloth store
