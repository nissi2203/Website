// Lädt und zeigt die 5 neuesten RSS-Einträge von MacRumors an
document.addEventListener("DOMContentLoaded", async () => {
const feedUrl = "feed.json";

  try {
    const response = await fetch(feedUrl);
const data = await response.json();
const items = data.items.slice(0, 5);
    const container = document.createElement("ul");
    container.className = "news-feed__list";

    items.forEach((item) => {
      const title = item.title;
const link = item.link;
const pubDate = new Date(item.pubDate).toLocaleDateString("de-DE");
const excerpt = item.description.substring(0, 160) + "...";
const imgSrc = item.thumbnail || "https://via.placeholder.com/100";

      const li = document.createElement("li");
      li.className = "news-feed__item";
      // <img class="news-feed__image" src="${imgSrc}" alt="Artikelbild">
      li.innerHTML = `
  <div class="news-feed__row">
    <img class="news-feed__image" src="${imgSrc}" alt="Artikelbild" width="100" height="100" style="object-fit:cover;">
    <div class="news-feed__content">
      <h3 class="news-feed__title"><a href="${link}" target="_blank">${title}</a></h3>
      <p class="news-feed__excerpt">${excerpt}</p>
      <time class="news-feed__date">${pubDate}</time>
    </div>
  </div>
`;
      container.appendChild(li);
    });

    const section = document.querySelector(".news-feed");
    if (section) {
      section.innerHTML = "";
      section.appendChild(container);
    }
  } catch (err) {
    console.error("RSS konnte nicht geladen werden:", err);
  }
});
