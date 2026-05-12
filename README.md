# Asian Treasures

![Static Site](https://img.shields.io/badge/site-static-0f766e)
![GitHub Pages](https://img.shields.io/badge/hosting-GitHub%20Pages-24292f)
![Catalog](https://img.shields.io/badge/catalog-file%20based-b45309)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

Asian Treasures is a repo for making a very simple online shop on GitHub for free. It is a lightweight static storefront for small shops, pop-up sellers, boutiques, and personal collections that need a clean product gallery without paying for hosting, maintaining a backend, or managing a full ecommerce platform.

The store runs on plain HTML, CSS, JavaScript, product images, and a generated `catalog.json` file. Publish it with GitHub Pages and customers can browse products, open item details, and contact the seller through WhatsApp or another configured method.

## Why This Exists

Most small stores do not need a database, checkout system, or monthly software bill on day one. This project keeps the workflow simple:

- Add product folders and images.
- Write a small `details.txt` file for each item.
- Run one catalog build command.
- Commit and push to GitHub.
- Host the storefront for free with GitHub Pages.

It is intentionally file-based, portable, and easy to customize.

## Features

- 🛍️ Static storefront that works on GitHub Pages
- 🖼️ Product image galleries with multiple images per item
- 🗂️ Category filters generated from folders
- 🔎 Product details modal with price, description, size, color, and custom fields
- ↕️ Sorting by featured order, price, or name
- 💬 WhatsApp-ready contact flow for customer inquiries
- 🏷️ Sold item support through product metadata
- ⚙️ No database, server, or paid hosting required
- 📦 Apache-2.0 licensed for flexible reuse

## Project Structure

```text
.
├── index.html              # Storefront markup
├── styles.css              # Storefront styles
├── app.js                  # Catalog rendering and interactions
├── catalog.json            # Generated catalog consumed by the browser
├── config/
│   └── payment.json        # Store name, currency, order message, contact methods
├── catalog/
│   └── category-name/
│       └── product-name/
│           ├── 1.webp
│           ├── 2.webp
│           └── details.txt
├── scripts/
│   ├── build_catalog.py
│   ├── crawl_old_website.py
│   └── import_old_website_catalog.py
└── LICENSE
```

## Requirements

No Node.js install or package setup is required for the catalog workflow.

You only need:

- Python 3
- Git
- A GitHub account if you want to publish with GitHub Pages

## Quick Start

1. Fork or copy this repository.
2. Replace the products in `catalog/` with your own categories and items.
3. Update `config/payment.json` with your store name and contact method.
4. Rebuild the catalog:

```bash
python3 scripts/build_catalog.py
```

5. Commit and push the changes:

```bash
git add catalog catalog.json config/payment.json
git commit -m "Update store catalog"
git push
```

6. Enable GitHub Pages in the repository settings.

Recommended GitHub Pages settings:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

## Adding Products

Create a folder for each category inside `catalog/`, then create one folder per product.

```text
catalog/
  clothes/
    emerald-embroidered-kurta/
      1.webp
      2.webp
      details.txt
  shoes/
    gold-khussa/
      1.jpg
      details.txt
```

Supported image formats:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif`
- `.svg`

Images are displayed in filename order, so names like `1.webp`, `2.webp`, and `3.webp` work well.

## Product Details

Each product folder can include a `details.txt` file:

```text
name: Emerald Embroidered Kurta
price: $79
size: S, M, L
color: Emerald
description: Elegant Pakistani kurta with embroidery.
status: available
```

Special fields:

- `name` controls the product title.
- `price` is used for display and price sorting.
- `description` appears in the product detail view.
- `status: sold` marks an item as sold and changes the inquiry message.

Any other field is shown automatically in the product details panel. For example, `fabric`, `brand`, `condition`, `measurements`, or `shipping_note` can be added without changing code.

If `name` is missing, the catalog builder creates a title from the folder name. For example, `emerald-embroidered-kurta` becomes `Emerald Embroidered Kurta`.

## Rebuilding the Catalog

Run this command whenever you add, remove, rename, or edit product folders:

```bash
python3 scripts/build_catalog.py
```

The command regenerates `catalog.json`, which is the file the storefront reads in the browser.

After rebuilding, commit and push both the product files and `catalog.json`. New products will not appear on the live GitHub Pages site until the regenerated `catalog.json` is published.

## Contact and Ordering

Edit `config/payment.json` to change the store name, currency, customer message, and contact methods.

```json
{
  "storeName": "Asian Treasures",
  "currency": "USD",
  "orderMessage": "Message us on WhatsApp Business to ask questions, confirm availability, and place your order.",
  "methods": [
    {
      "type": "WhatsApp",
      "label": "WhatsApp Business",
      "value": "+1 555 123 4567"
    }
  ]
}
```

For WhatsApp, `value` can be either a phone number or a direct WhatsApp link. Product inquiry links are generated automatically.

## Importing an Existing WordPress Catalog

The repository includes optional helper scripts used to preserve and import an older WordPress catalog.

```bash
python3 scripts/crawl_old_website.py
python3 scripts/import_old_website_catalog.py --clean
python3 scripts/build_catalog.py
```

The imported archive, if present, is stored in `Old_Website/`:

- `Old_Website/manifest.json` lists crawled pages and downloaded images.
- `Old_Website/pages/` contains saved page HTML.
- `Old_Website/images/` contains downloaded images.
- `Old_Website/import_summary.json` lists imported products.

These scripts are optional. A new store can be managed entirely through the `catalog/` folders and `details.txt` files.

## Free GitHub Store Workflow

This project is a practical pattern for creating simple stores on GitHub for free:

1. Use GitHub as the product file manager.
2. Use `catalog/` folders as the source of truth.
3. Use `catalog.json` as the generated storefront data.
4. Use GitHub Pages as free static hosting.
5. Use WhatsApp, email, or another contact method to complete orders manually.

This is best for catalogs, boutique inventory, preorder lists, pop-up collections, resale shops, and small businesses that want a professional web presence without platform overhead.

## License

This project is licensed under the Apache License 2.0. See [`LICENSE`](LICENSE) for the full license text.

The Apache-2.0 license allows use, modification, distribution, and private or commercial reuse, subject to the license terms. Product photos, brand assets, imported catalog content, and store inventory data may have separate ownership or usage rights, so only publish assets you have permission to use.
