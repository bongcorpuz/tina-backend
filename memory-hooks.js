export function extractMemoryHooks(message = "") {
  const text = message.toLowerCase();
  const hooks = [];

  if (text.includes("remember that")) {
    hooks.push({ hook_key: "explicit_memory", hook_value: message });
  }

  if (text.includes("i prefer") || text.includes("from now on")) {
    hooks.push({ hook_key: "preference", hook_value: message });
  }

  if (text.includes("my company") || text.includes("our company")) {
    hooks.push({ hook_key: "company_context", hook_value: message });
  }

  if (text.includes("tina") || text.includes("aria")) {
    hooks.push({ hook_key: "project_context", hook_value: message });
  }

  return hooks;
}

export async function saveMemoryHooks(supabase, userId, hooks = []) {
  if (!userId || !hooks.length) return;

  const rows = hooks.map(hook => ({
    user_id: userId,
    hook_key: hook.hook_key,
    hook_value: hook.hook_value,
    source: "chat"
  }));

  const { error } = await supabase.from("memory_hooks").insert(rows);
  if (error) throw error;
}