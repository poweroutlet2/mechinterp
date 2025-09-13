export interface SteeringPreset {
	id: string;
	name: string;
	description?: string;
	user_prompts: string[];
	positive_responses: string[];
	negative_responses: string[];
}

export async function fetchSteeringPresets(): Promise<SteeringPreset[]> {
	const response = await fetch("/presets/steering-presets.json");
	if (!response.ok) {
		throw new Error("Failed to load steering presets");
	}
	const data = (await response.json()) as SteeringPreset[];
	return data;
}
