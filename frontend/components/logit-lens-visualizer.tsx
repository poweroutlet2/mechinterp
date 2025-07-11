"use client";

import { memo, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type LogitLensLayer = [string, number[], string[]];

interface LogitLensResponse {
	most_likely_token: string;
	logit_lens: LogitLensLayer[];
}

const LogitLensPlot = memo(({ data }: { data: LogitLensResponse }) => {
	const { plotData, layout } = useMemo(() => {
		const y = data.logit_lens.map((layer) => layer[0].replace("blocks.", "L").replace(".hook_resid_post", ""));
		const z = data.logit_lens.map((layer) => layer[1]);
		const text = data.logit_lens.map((layer) => layer[2].map((token) => `Token: "${token}"`));

		const numTokens = z[0] ? z[0].length : 0;
		const x = Array.from(Array(numTokens).keys());

		const plotData = [
			{
				x,
				y,
				z,
				text,
				type: "heatmap",
				hovertemplate: "<b>%{y}</b><br>Token index: %{x}<br>%{text}<br>Prob: %{z}<extra></extra>",
				colorscale: "Viridis",
			},
		];

		const layout = {
			title: "Logit Lens Heatmap",
			xaxis: { title: "Token Position" },
			yaxis: { title: "Layer", automargin: true },
		};

		return { plotData, layout };
	}, [data]);

	return (
		<Plot
			data={plotData}
			layout={layout}
			style={{ width: "100%", height: "800px" }}
			config={{ responsive: true }}
		/>
	);
});

LogitLensPlot.displayName = "LogitLensPlot";

export function LogitLensVisualizer() {
	const [model, setModel] = useState("gpt2-small");
	const [inputText, setInputText] = useState("The quick brown fox jumps over the lazy dog");
	const [logitLensData, setLogitLensData] = useState<LogitLensResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleFetchLogitLens = async () => {
		setLoading(true);
		setError(null);
		setLogitLensData(null);

		try {
			const response = await fetch("http://127.0.0.1:8000/logitlens", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model_name: model,
					input: inputText,
				}),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || "Network response was not ok");
			}
			const data: LogitLensResponse = await response.json();
			setLogitLensData(data);
		} catch (error) {
			console.error("Failed to fetch logit lens data:", error);
			setError(error instanceof Error ? error.message : "An unknown error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h1 className="text-2xl font-bold mb-4">Logit Lens Visualization</h1>
			<div className="flex flex-col sm:flex-row gap-4 mb-4">
				<div className="flex flex-col gap-2">
					<label htmlFor="model-select">Model</label>
					<Select value={model} onValueChange={setModel}>
						<SelectTrigger id="model-select" className="w-full sm:w-[180px]">
							<SelectValue placeholder="Select a model" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="gpt2-small">gpt2-small</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-2 flex-grow">
					<label htmlFor="input-text">Input Text</label>
					<Input
						id="input-text"
						value={inputText}
						onChange={(e) => setInputText(e.target.value)}
						placeholder="Enter text"
					/>
				</div>
				<div className="flex items-end">
					<Button onClick={handleFetchLogitLens} disabled={loading} className="w-full sm:w-auto">
						{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{loading ? "Analyzing..." : "Analyze"}
					</Button>
				</div>
			</div>
			{error && (
				<div className="text-red-500 bg-red-100 border border-red-400 rounded p-4 mb-4">
					<p className="font-bold">Error:</p>
					<p>{error}</p>
				</div>
			)}
			{loading && (
				<div className="flex justify-center items-center h-64">
					<Loader2 className="h-16 w-16 animate-spin text-primary" />
				</div>
			)}
			{logitLensData && (
				<div className="border rounded-lg p-4">
					<p className="mb-4">
						<span className="font-semibold">Most Likely Next Token:</span>{" "}
						<span className="font-mono bg-muted p-1 rounded">{logitLensData.most_likely_token}</span>
					</p>
					<LogitLensPlot data={logitLensData} />
				</div>
			)}
		</div>
	);
}
