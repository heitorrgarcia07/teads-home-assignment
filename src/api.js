const API_URL = "https://jsonplaceholder.typicode.com/posts";

export async function fetchCreatives() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}
