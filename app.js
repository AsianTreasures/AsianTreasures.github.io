const state = {
  catalog: [],
  category: "all",
  sort: "featured",
  payment: null,
};

const grid = document.querySelector("#product-grid");
const filters = document.querySelector(".filters");
const count = document.querySelector("#item-count");
const sortSelect = document.querySelector("#sort-select");
const paymentList = document.querySelector("#payment-list");
const dialog = document.querySelector("#product-dialog");
const dialogClose = document.querySelector("#dialog-close");

const moneyNumber = (value) => Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
const pretty = (value) => value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

async function loadData() {
  const [catalogResponse, paymentResponse] = await Promise.all([
    fetch("catalog.json"),
    fetch("config/payment.json"),
  ]);

  state.catalog = await catalogResponse.json();
  state.payment = await paymentResponse.json();

  renderFilters();
  renderPayments();
  renderCatalog();
}

function flattenCatalog() {
  return state.catalog.flatMap((category) =>
    category.items.map((item, index) => ({
      ...item,
      category: category.name,
      categorySlug: category.slug,
      featuredIndex: index,
    })),
  );
}

function visibleItems() {
  const items = flattenCatalog().filter((item) => state.category === "all" || item.categorySlug === state.category);

  return items.sort((a, b) => {
    if (state.sort === "price-low") return moneyNumber(a.details.price) - moneyNumber(b.details.price);
    if (state.sort === "price-high") return moneyNumber(b.details.price) - moneyNumber(a.details.price);
    if (state.sort === "name") return a.details.name.localeCompare(b.details.name);
    return a.categorySlug.localeCompare(b.categorySlug) || a.featuredIndex - b.featuredIndex;
  });
}

function renderFilters() {
  const categoryButtons = state.catalog.map((category) => {
    const button = document.createElement("button");
    button.className = "filter";
    button.dataset.category = category.slug;
    button.type = "button";
    button.textContent = category.name;
    return button;
  });

  filters.append(...categoryButtons);
}

function renderCatalog() {
  const items = visibleItems();
  grid.replaceChildren();
  count.textContent = `${items.length} ${items.length === 1 ? "piece" : "pieces"}`;

  for (const item of items) {
    const card = document.createElement("button");
    card.className = "product-card";
    card.type = "button";
    card.innerHTML = `
      <img src="${item.images[0]}" alt="${item.details.name}">
      <div class="card-body">
        <p class="card-meta">${item.category}</p>
        <h3>${item.details.name}</h3>
        <div class="card-row">
          <span>${item.details.price || ""}</span>
          <span>${item.details.color || item.details.size || "Details"}</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => openDialog(item));
    grid.append(card);
  }
}

function renderPayments() {
  paymentList.replaceChildren();

  const intro = document.createElement("p");
  intro.className = "contact-intro";
  intro.textContent =
    state.payment.orderMessage || "Message us on WhatsApp Business to ask questions and place your order.";
  paymentList.append(intro);

  for (const method of state.payment.methods) {
    const link = method.type.toLowerCase() === "whatsapp" ? whatsappHref(method.value, "") : method.value;
    const row = document.createElement("div");
    row.className = "payment-item";
    row.innerHTML = `<strong>${method.label}</strong><a href="${link}" target="_blank" rel="noopener">${method.value}</a>`;
    paymentList.append(row);
  }
}

function whatsappHref(value, message) {
  const trimmed = String(value || "").trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return `${trimmed}${message ? `${trimmed.includes("?") ? "&" : "?"}text=${message}` : ""}`;
  }
  return `https://wa.me/${trimmed.replace(/\D/g, "")}${message ? `?text=${message}` : ""}`;
}

function contactLinks(item) {
  const message = encodeURIComponent(
    [
      "Hi Asian Treasures, I am interested in this item:",
      "",
      `Name: ${item.details.name}`,
      `Price: ${item.details.price || "Please confirm"}`,
      `Category: ${item.category}`,
      "",
      "Is it available?",
      "Please let me know the available sizes.",
    ].join("\n"),
  );
  return state.payment.methods
    .map((method) => {
      const type = method.type.toLowerCase();
      if (type === "whatsapp") return { label: "Message on WhatsApp", href: whatsappHref(method.value, message), secondary: false };
      return { label: method.label, href: "#contact", secondary: true };
    })
    .slice(0, 1);
}

function openDialog(item) {
  const image = document.querySelector("#dialog-image");
  const thumbRow = document.querySelector("#thumb-row");
  const detailsList = document.querySelector("#details-list");
  const actions = document.querySelector("#dialog-actions");

  document.querySelector("#dialog-category").textContent = item.category;
  document.querySelector("#dialog-title").textContent = item.details.name;
  document.querySelector("#dialog-price").textContent = item.details.price || "";
  document.querySelector("#dialog-description").textContent = item.details.description || "";

  image.src = item.images[0];
  image.alt = item.details.name;
  thumbRow.replaceChildren();

  item.images.forEach((src, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === 0 ? "active" : "";
    button.innerHTML = `<img src="${src}" alt="${item.details.name} view ${index + 1}">`;
    button.addEventListener("click", () => {
      image.src = src;
      thumbRow.querySelectorAll("button").forEach((thumb) => thumb.classList.remove("active"));
      button.classList.add("active");
    });
    thumbRow.append(button);
  });

  detailsList.replaceChildren();
  Object.entries(item.details)
    .filter(([key]) => !["name", "price", "description"].includes(key))
    .forEach(([key, value]) => {
      const row = document.createElement("div");
      row.innerHTML = `<dt>${pretty(key)}</dt><dd>${value}</dd>`;
      detailsList.append(row);
    });

  actions.replaceChildren();
  contactLinks(item).forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = `interest-link${link.secondary ? " secondary" : ""}`;
    anchor.href = link.href;
    anchor.textContent = link.label;
    actions.append(anchor);
  });

  dialog.showModal();
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  state.category = button.dataset.category;
  filters.querySelectorAll(".filter").forEach((filter) => filter.classList.toggle("active", filter === button));
  renderCatalog();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderCatalog();
});

dialogClose.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

loadData().catch((error) => {
  count.textContent = "Catalog could not be loaded.";
  console.error(error);
});
