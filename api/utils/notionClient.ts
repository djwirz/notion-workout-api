const { NOTION_API_KEY, NOTION_INBOX_DB_ID, WORKOUT_ENTRIES_DB_ID, WORKOUT_TEMPLATES_DB_ID } = process.env;

if (!NOTION_API_KEY || !WORKOUT_ENTRIES_DB_ID || !WORKOUT_TEMPLATES_DB_ID || !NOTION_INBOX_DB_ID) {
  throw new Error("Missing required environment variables.");
}

const HEADERS = {
  Authorization: `Bearer ${NOTION_API_KEY}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

async function fetchFromNotion(endpoint: string, options: RequestInit = {}) {
  const url = `https://api.notion.com/v1/${endpoint}`;
  const response = await fetch(url, { headers: HEADERS, ...options });

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error(`Notion API error: ${response.status} - ${errorDetails}`);
    throw new Error(`Notion API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getWorkoutTemplate(workoutId: string) {
  return fetchFromNotion(`pages/${workoutId}`)
    .then(data => data?.properties?.["Workout Template"]?.relation?.at(0)?.id || null);
}

export async function getWorkoutEntryTemplates(workoutTemplateId: string) {
  return fetchFromNotion(`databases/${WORKOUT_TEMPLATES_DB_ID}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        property: "Workout Template",
        relation: { contains: workoutTemplateId },
      },
    }),
  }).then(data => data?.results || []);
}

export async function createWorkoutEntry(workoutId: string, entry: any) {
  return fetchFromNotion(`pages`, {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: WORKOUT_ENTRIES_DB_ID },
      properties: {
        Name: {
          title: [{ text: { content: entry?.properties?.Name?.title?.at(0)?.text?.content || "Unnamed Exercise" } }],
        },
        Workout: { relation: [{ id: workoutId }] },
        Exercise: entry?.properties?.Exercise || {},
        Reps: entry?.properties?.Reps || {},
        Sets: entry?.properties?.Sets || {},
        Weight: entry?.properties?.Weight || {},
      },
    }),
  });
}

export async function logApiInteraction(endpoint: string, requestData: any, responseData: any, status: string) {
  return fetchFromNotion(`pages`, {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: NOTION_INBOX_DB_ID },
      properties: {
        Name: {
          title: [{ text: { content: `Interaction: ${endpoint}` } }],
        },
        Timestamp: {
          date: { start: new Date().toISOString() },
        },
        Status: {
          select: { name: status },
        },
        Request: {
          rich_text: [{ text: { content: JSON.stringify(requestData, null, 2) } }],
        },
        Response: {
          rich_text: [{ text: { content: JSON.stringify(responseData, null, 2) } }],
        },
      },
    }),
  });
}
