const categoryLabels = {
  international: "International workshop",
  domestic: "Domestic workshop",
  seminar: "Seminar"
};

const categoryOrder = ["international", "domestic", "seminar"];

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return response.json();
}

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent !== undefined && textContent !== null) {
    element.textContent = textContent;
  }

  return element;
}

function createLinkRow(links) {
  const linkRow = createElement("p", "link-row");

  if (!Array.isArray(links) || links.length === 0) {
    return linkRow;
  }

  links.forEach((link) => {
    if (!link || !link.label || !link.href) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;

    if (link.external) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }

    linkRow.appendChild(anchor);
  });

  return linkRow;
}

function createTalkItem(talk) {
  const item = document.createElement("li");

  const title = createElement("span", "talk-title", talk.title);
  item.appendChild(title);

  if (talk.venue || talk.date) {
    const meta = createElement("span", "talk-meta");

    const pieces = [];
    if (talk.venue) {
      pieces.push(talk.venue);
    }
    if (talk.date) {
      pieces.push(talk.date);
    }

    meta.textContent = pieces.join(", ");
    item.appendChild(meta);
  }

  if (Array.isArray(talk.badges) && talk.badges.length > 0) {
    const badgeRow = createElement("span", "badge-row");

    talk.badges.forEach((badge) => {
      const badgeElement = createElement("span", "badge", badge);
      badgeRow.appendChild(badgeElement);
    });

    item.appendChild(badgeRow);
  }

  const links = createLinkRow(talk.links);
  if (links.children.length > 0) {
    item.appendChild(links);
  }

  return item;
}

function createCategorySection(categoryKey, talks) {
  const section = createElement("section", "talk-section");
  const heading = createElement("h4", null, categoryLabels[categoryKey] || categoryKey);
  section.appendChild(heading);

  if (!Array.isArray(talks) || talks.length === 0) {
    section.appendChild(createElement("p", "empty-note", "No entry."));
    return section;
  }

  const list = createElement("ul", "activity-list");

  talks.forEach((talk) => {
    list.appendChild(createTalkItem(talk));
  });

  section.appendChild(list);
  return section;
}

function createYearPanel(year, data, isActive) {
  const panel = createElement("section", `year-panel${isActive ? " active" : ""}`);
  panel.dataset.year = year;

  categoryOrder.forEach((categoryKey) => {
    panel.appendChild(createCategorySection(categoryKey, data[categoryKey] || []));
  });

  return panel;
}

function setDropdownOpen(root, isOpen) {
  const dropdown = root.querySelector(".year-dropdown");
  const button = root.querySelector(".year-dropdown-button");

  if (!dropdown || !button) {
    return;
  }

  dropdown.classList.toggle("open", isOpen);
  button.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function activateYear(root, year) {
  const button = root.querySelector(".year-dropdown-button");
  const options = root.querySelectorAll(".year-option");
  const panels = root.querySelectorAll(".year-panel");

  if (button) {
    button.querySelector(".selected-year").textContent = year;
  }

  options.forEach((option) => {
    const isActive = option.dataset.year === year;
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.year === year);
  });

  setDropdownOpen(root, false);
}

function createYearDropdown(root, years) {
  const dropdown = createElement("div", "year-dropdown");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "year-dropdown-button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const selectedYear = createElement("span", "selected-year", years[0]);
  const arrow = createElement("span", "dropdown-arrow", "▾");

  button.appendChild(selectedYear);
  button.appendChild(arrow);

  const list = createElement("div", "year-options");
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Talk years");

  years.forEach((year, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `year-option${index === 0 ? " active" : ""}`;
    option.dataset.year = year;
    option.textContent = year;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", index === 0 ? "true" : "false");

    option.addEventListener("click", () => {
      activateYear(root, year);
    });

    list.appendChild(option);
  });

  button.addEventListener("click", () => {
    dropdown.classList.toggle("open");
    button.setAttribute(
      "aria-expanded",
      dropdown.classList.contains("open") ? "true" : "false"
    );
  });

  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) {
      setDropdownOpen(root, false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDropdownOpen(root, false);
    }
  });

  dropdown.appendChild(button);
  dropdown.appendChild(list);

  return dropdown;
}

async function renderTalks() {
  const root = document.getElementById("talks-root");

  if (!root) {
    return;
  }

  try {
    const manifest = await loadJson("data/talks/manifest.json");
    const years = manifest.years || [];

    if (years.length === 0) {
      root.innerHTML = "";
      root.appendChild(createElement("p", "empty-note", "No talk data found."));
      return;
    }

    const yearDataPairs = await Promise.all(
      years.map(async (year) => {
        const data = await loadJson(`data/talks/${year}.json`);
        return [year, data];
      })
    );

    root.innerHTML = "";

    const dropdown = createYearDropdown(root, years);
    const panels = createElement("div", "year-panels");

    yearDataPairs.forEach(([year, data], index) => {
      panels.appendChild(createYearPanel(year, data, index === 0));
    });

    root.appendChild(dropdown);
    root.appendChild(panels);
  } catch (error) {
    root.innerHTML = "";
    root.appendChild(
      createElement(
        "p",
        "empty-note",
        "Talk data could not be loaded. Please check activities.js and data/talks/*.json."
      )
    );
    console.error(error);
  }
}

renderTalks();