export function renderCreatives(creatives, results) {
  results.replaceChildren();
  creatives.forEach(({ id, title, status }) => {
    const item = results.ownerDocument.createElement("li");
    item.textContent = `${id} — ${title} — ${status}`;
    results.appendChild(item);
  });
}
