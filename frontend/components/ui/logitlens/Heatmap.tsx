"use client";

import dynamic from "next/dynamic";
import { LogitLensLayer } from "./LogitLens";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface HeatmapProps {
	input_tokens: string[];
	data: LogitLensLayer[];
}

export default function Heatmap({ data, input_tokens }: HeatmapProps) {
	if (!data || data.length === 0) {
		return null;
	}
	const yLabels = data.map((layer) => layer.hook_name.replace("blocks.", "L").replace(".hook_resid_post", ""));
	const xLabels = input_tokens.map((_, index) => index);
	const zValues = data.map((layer) => layer.max_probs);
	const textValues = data.map((layer) => layer.max_prob_tokens);

	const chartWidth = `${input_tokens.length * 100}`;

	return (
		<Plot
			data={[
				{
					x: xLabels,
					y: yLabels,
					z: zValues,
					text: textValues,
					texttemplate: "%{text}",
					hovertemplate: "Layer: %{y}<br>Token: %{text}<br>Prob: %{z}<extra></extra>",
					customdata: input_tokens,
					type: "heatmap",
					colorscale: "Viridis",
					showscale: true,
					colorbar: {
						title: {
							text: "Prob",
						},
					},
				},
			]}
			layout={{
				title: "Logit Lens Heatmap",
				xaxis: {
					title: {
						text: "Input Token",
					},
					tickmode: "array",
					tickvals: xLabels,
					ticktext: input_tokens,
				},
				yaxis: {
					title: {
						text: "Layer",
					},
					autorange: "reversed",
				},
				shapes: [
					{
						type: "rect",
						x0: input_tokens.length - 1 - 0.5,
						x1: input_tokens.length - 1 + 0.5,
						y0: yLabels.length - 1 - 0.5,
						y1: yLabels.length - 1 + 0.5,
						line: {
							color: "#bedbff",
							width: 3,
						},
						fillcolor: "rgba(0,0,0,0)",
					},
				],
			}}
			className={`max-h-screen w-[${chartWidth}] max-w-[90vw]`}
		/>
	);
}
