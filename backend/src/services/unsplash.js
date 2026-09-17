const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1518709268805-4e9042?auto=format&fit=crop&w=2000&q=80';

async function findImage(keyword, {
  fetchImpl = global.fetch,
  accessKey = process.env.UNSPLASH_ACCESS_KEY,
} = {}) {
  const fallback = `https://images.unsplash.com/photo-1518709268805-4e9042?auto=format&fit=crop&w=2000&q=80&keyword=${encodeURIComponent(keyword)}`;

  if (!accessKey) return fallback;

  try {
    const url = new URL('https://api.unsplash.com/photos/random');
    url.searchParams.set('query', keyword);
    url.searchParams.set('orientation', 'landscape');
    const response = await fetchImpl(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    return data?.urls?.regular || fallback;
  } catch (error) {
    return fallback;
  }
}

module.exports = { FALLBACK_IMAGE, findImage };