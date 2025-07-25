// This function will handle your API requests for news data.
// You can use libraries like 'axios' or 'node-fetch' to call external news APIs.

export const handler = async (event, context) => {
  // TODO: Replace this with your actual news API fetching logic.
  const placeholderArticles = [
    { id: 1, title: "Hello from your new Netlify Function!", content: "This data is now served serverlessly." },
    { id: 2, title: "Real-time News Stream", content: "Connect to your news API here." }
  ];

  try {
    return {
      statusCode: 200,
      body: JSON.stringify(placeholderArticles),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch articles' }),
    };
  }
};
