export async function awardXp(action: string, targetId?: string | null) {
  if (!targetId) return null;

  try {
    const response = await fetch("/api/xp/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, targetId }),
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
