import { VercelRequest, VercelResponse } from "@vercel/node";
import { getWorkoutTemplate, getWorkoutEntryTemplates, createWorkoutEntry } from "./utils/notionClient";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const workoutId = req.query.workout_id as string;
  if (!workoutId) return res.status(400).json({ error: "Missing workout_id" });

  try {
    const workoutTemplateId = await getWorkoutTemplate(workoutId);
    if (!workoutTemplateId) return res.status(404).json({ error: "Workout Template not found" });

    const entryTemplates = await getWorkoutEntryTemplates(workoutTemplateId);
    if (entryTemplates.length === 0) return res.status(200).json({ message: "No entry templates found." });

    const createPromises = entryTemplates.map((entry: any) => createWorkoutEntry(workoutId, entry));
    await Promise.all(createPromises);

    res.status(200).json({ message: "Workout Entries created successfully." });
  } catch (error) {
    console.error("Error processing workout entries:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
