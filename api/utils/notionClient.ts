const NOTION_API_KEY = process.env.NOTION_API_KEY;
const WORKOUT_ENTRIES_DB_ID = process.env.WORKOUT_ENTRIES_DB_ID;
const WORKOUT_TEMPLATES_DB_ID = process.env.WORKOUT_TEMPLATES_DB_ID;
const NOTION_INBOX_DB_ID = process.env.NOTION_INBOX_DB_ID;

const validateEnvironmentVariables = () => {
  const requiredVars = {
    NOTION_API_KEY,
    WORKOUT_ENTRIES_DB_ID,
    WORKOUT_TEMPLATES_DB_ID,
    NOTION_INBOX_DB_ID,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
};

validateEnvironmentVariables();

const HEADERS = {
  "Authorization": `Bearer ${NOTION_API_KEY}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

async function fetchFromNotion(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { headers: HEADERS, ...options });

  if (!response.ok) {
    const errorDetails = await response.text();
    console.error(`Notion API error: ${response.status} - ${errorDetails}`);
    throw new Error(`Notion API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getWorkoutTemplate(workoutId: string) {
  const data = await fetchFromNotion(`https://api.notion.com/v1/pages/${workoutId}`);
  return data?.properties?.["Workout Template"]?.relation?.at(0)?.id || null;
}

export async function getWorkoutEntryTemplates(workoutTemplateId: string) {
  const body = JSON.stringify({
    filter: {
      property: "Workout Template",
      relation: { contains: workoutTemplateId },
    },
  });

  const data = await fetchFromNotion(`https://api.notion.com/v1/databases/${WORKOUT_TEMPLATES_DB_ID}/query`, {
    method: "POST",
    body,
  });

  return data?.results || [];
}

export async function createWorkoutEntry(workoutId: string, entry: any) {
  const body = JSON.stringify({
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
  });

  return fetchFromNotion(`https://api.notion.com/v1/pages`, { method: "POST", body });
}

export async function logApiInteraction(endpoint: string, requestData: any, responseData: any, status: string) {
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({
    parent: { database_id: NOTION_INBOX_DB_ID },
    properties: {
      Name: {
        title: [{ text: { content: `Interaction: ${endpoint}` } }],
      },
      Timestamp: {
        date: { start: timestamp },
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
  });

  return fetchFromNotion(`https://api.notion.com/v1/pages`, { method: "POST", body });
}

