const state = {
  catalog: [],
  category: "all",
  sort: "featured",
  payment: null,
  shipping: window.shippingConfig || null,
};

const grid = document.querySelector("#product-grid");
const filters = document.querySelector(".filters");
const count = document.querySelector("#item-count");
const sortSelect = document.querySelector("#sort-select");
const paymentList = document.querySelector("#payment-list");
const dialog = document.querySelector("#product-dialog");
const dialogClose = document.querySelector("#dialog-close");
const shippingForm = document.querySelector("#shipping-form");
const suitCount = document.querySelector("#suit-count");
const shippingRegion = document.querySelector("#shipping-region");
const shippingCost = document.querySelector("#shipping-cost");
const shippingTime = document.querySelector("#shipping-time");
const shippingService = document.querySelector("#shipping-service");
const shippingFreeNote = document.querySelector("#shipping-free-note");
const shippingExclusion = document.querySelector("#shipping-exclusion");

const moneyNumber = (value) => Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
const pretty = (value) => value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const isSoldOut = (item) => String(item.details.status || "").toLowerCase() === "sold";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

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
  const items = [];

  state.catalog.forEach((category) => {
    category.items.forEach((item, index) => {
      const catalogItem = Object.assign({}, item);
      catalogItem.category = category.name;
      catalogItem.categorySlug = category.slug;
      catalogItem.featuredIndex = index;
      items.push(catalogItem);
    });
  });

  return items;
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

  categoryButtons.forEach((button) => filters.appendChild(button));
}

function renderCatalog() {
  const items = visibleItems();
  clearElement(grid);
  count.textContent = `${items.length} ${items.length === 1 ? "piece" : "pieces"}`;

  for (const item of items) {
    const card = document.createElement("button");
    const soldOut = isSoldOut(item);
    card.className = `product-card${soldOut ? " sold-out" : ""}`;
    card.type = "button";
    card.innerHTML = `
      <div class="card-image">
        <img src="${item.images[0]}" alt="${item.details.name}">
        ${soldOut ? '<span class="sold-badge">Sold</span>' : ""}
      </div>
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
    grid.appendChild(card);
  }
}

function renderPayments() {
  clearElement(paymentList);

  const intro = document.createElement("p");
  intro.className = "contact-intro";
  intro.textContent =
    state.payment.orderMessage || "Message us on WhatsApp Business to ask questions and place your order.";
  paymentList.appendChild(intro);

  for (const method of state.payment.methods) {
    const link = method.type.toLowerCase() === "whatsapp" ? whatsappHref(method.value, "") : method.value;
    const row = document.createElement("div");
    row.className = "payment-item";
    row.innerHTML = `<strong>${method.label}</strong><a href="${link}" target="_blank" rel="noopener">${method.value}</a>`;
    paymentList.appendChild(row);
  }
}

function calculateShipping(baseRate, count) {
  const extraSuitCount = Math.max(0, count - 1);
  return baseRate * (1 + extraSuitCount * state.shipping.additionalSuitMultiplier);
}

function renderShippingCalculator() {
  if (!state.shipping || !shippingForm) return;

  shippingService.textContent = state.shipping.serviceName;
  shippingFreeNote.textContent = state.shipping.freeShippingMessage;
  shippingExclusion.textContent = state.shipping.excludedDestinations;
  clearElement(shippingRegion);

  state.shipping.regions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region.id;
    option.textContent = region.label;
    shippingRegion.appendChild(option);
  });

  updateShippingEstimate();
}

function updateShippingEstimate() {
  if (!state.shipping || !shippingRegion) return;

  const selectedRegion = state.shipping.regions.find((region) => region.id === shippingRegion.value);
  const count = Number.parseInt(suitCount.value, 10);

  if (!selectedRegion) {
    shippingCost.textContent = "$0.00";
    shippingTime.textContent = "Select a region";
    return;
  }

  if (!count || count < 1) {
    shippingCost.textContent = "$0.00";
    shippingTime.textContent = selectedRegion.deliveryTime;
    return;
  }

  shippingCost.textContent = currency.format(calculateShipping(selectedRegion.baseRate, Math.min(count, 12)));
  shippingTime.textContent = selectedRegion.deliveryTime;
}

function normalizeSuitCount() {
  const count = Number.parseInt(suitCount.value, 10);

  if (!count || count < 1) {
    suitCount.value = 1;
  } else if (count > 12) {
    suitCount.value = 12;
  } else {
    suitCount.value = count;
  }

  updateShippingEstimate();
}

function whatsappHref(value, message) {
  const trimmed = String(value || "").trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return `${trimmed}${message ? `${trimmed.includes("?") ? "&" : "?"}text=${message}` : ""}`;
  }
  return `https://wa.me/${trimmed.replace(/\D/g, "")}${message ? `?text=${message}` : ""}`;
}

function contactLinks(item) {
  const soldOut = isSoldOut(item);
  const message = encodeURIComponent(
    soldOut
      ? [
          "Hi Asian Treasures, I saw this sold item and would like something similar:",
          "",
          `Name: ${item.details.name}`,
          `Price: ${item.details.price || "Please confirm"}`,
          `Category: ${item.category}`,
          "",
          "Can you show me similar available styles?",
        ].join("\n")
      : [
          "Hi Asian Treasures, I am interested in this item:",
          "",
          `Name: ${item.details.name}`,
          `Price: ${item.details.price || "Please confirm"}`,
          `Category: ${item.category}`,
          "",
          "Is it available?",
          "Please let me know the available sizes, shipping estimate, and return policy.",
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
  clearElement(thumbRow);

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
    thumbRow.appendChild(button);
  });

  clearElement(detailsList);
  Object.entries(item.details)
    .filter(([key]) => !["name", "price", "description"].includes(key))
    .forEach(([key, value]) => {
      const row = document.createElement("div");
      row.innerHTML = `<dt>${pretty(key)}</dt><dd>${value}</dd>`;
      detailsList.appendChild(row);
    });

  clearElement(actions);
  if (isSoldOut(item)) {
    const notice = document.createElement("p");
    notice.className = "sold-notice";
    notice.textContent = "This item is sold. Message us for similar available styles.";
    actions.appendChild(notice);
  }
  contactLinks(item).forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = `interest-link${link.secondary ? " secondary" : ""}`;
    anchor.href = link.href;
    anchor.textContent = link.label;
    actions.appendChild(anchor);
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

if (shippingForm) {
  shippingForm.addEventListener("input", updateShippingEstimate);
  shippingForm.addEventListener("change", updateShippingEstimate);
  shippingForm.addEventListener("submit", (event) => event.preventDefault());
}
if (suitCount) {
  suitCount.addEventListener("blur", normalizeSuitCount);
  suitCount.addEventListener("change", normalizeSuitCount);
}
dialogClose.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

renderShippingCalculator();
loadData().catch((error) => {
  count.textContent = "Catalog could not be loaded.";
  console.error(error);
});
