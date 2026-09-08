import { fetchCreatives } from "./api.js";
import { reviewCreatives } from "./reviewAds.js";
import { renderCreatives } from "./renderCreatives.js";

const reviewAdsButton = document.getElementById("reviewAds");
const message = document.getElementById("message");
const results = document.getElementById("results");

reviewAdsButton.addEventListener("click", async () => {
  reviewAdsButton.disabled = true;
  try {
    results.replaceChildren();
    message.textContent = "Reviewing ads...";
    const creatives = await fetchCreatives();
    const reviewedCreatives = reviewCreatives(creatives);
    console.log(reviewedCreatives);
    renderCreatives(reviewedCreatives, results);
    message.textContent = "Ads reviewed successfully. Results are shown below and in the browser console.";
  } catch (error) {
    console.error("Unable to review ads:", error);
    message.textContent = "Unable to review ads. Please try again later.";
  } finally {
    reviewAdsButton.disabled = false;
  }
});
