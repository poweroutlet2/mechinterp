export interface SteeringPreset {
	id: string;
	name: string;
	description?: string;
	positive: string[]; // max 10
	negative: string[]; // max 10
}

export async function fetchSteeringPresets(): Promise<SteeringPreset[]> {
	const response = await fetch("/presets/steering-presets.json", { cache: "force-cache" });
	if (!response.ok) {
		throw new Error("Failed to load steering presets");
	}
	const data = (await response.json()) as SteeringPreset[];
	return data;
}
