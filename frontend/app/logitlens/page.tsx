"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Circle, Loader2 } from "lucide-react";
import Heatmap from "./components/Heatmap";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface LogitLensLayer {
	hook_name: string;
	max_probs: number[];
	max_prob_tokens: string[];
}

export interface LogitLensResponse {
	input_tokens: string[];
	most_likely_token: string;
	logit_lens: LogitLensLayer[];
}

interface LogitLensRequest {
	model_name: string;
	input: string;
}

interface LoadedModelsResponse {
	[model_name: string]: string; // model_name -> loaded_timestamp
}

async function postLogitLens(request: LogitLensRequest): Promise<LogitLensResponse> {
	const response = await fetch(`${API_BASE_URL}/logitlens`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(request),
	});

	if (!response.ok) {
		throw new Error("Network response was not ok");
	}

	return response.json();
}

async function fetchLoadedModels(): Promise<LoadedModelsResponse> {
	const response = await fetch(`${API_BASE_URL}/loaded_models`);

	if (!response.ok) {
		throw new Error("Failed to fetch loaded models");
	}

	return response.json();
}

async function fetchAvailableModels(): Promise<string[]> {
	const response = await fetch(`${API_BASE_URL}/available_models`);

	if (!response.ok) {
		throw new Error("Failed to fetch available models");
	}

	return response.json();
}

type ModelStatus = "online" | "sleeping" | "loading";

function useModelStatus(
	modelName: string,
	loadedModels: LoadedModelsResponse | undefined,
	isLoadingModels: boolean
): ModelStatus {
	const calculateStatus = useCallback((): ModelStatus => {
		if (isLoadingModels) return "loading";
		const loadedTimestamp = loadedModels?.[modelName];
		if (!loadedTimestamp) return "sleeping";

		const timestamp = new Date(loadedTimestamp);
		const now = new Date();
		const diffInSeconds = (now.getTime() - timestamp.getTime()) / 1000;

		// Models are automatically unloaded after ~80 seconds
		return diffInSeconds > 80 ? "sleeping" : "online";
	}, [isLoadingModels, loadedModels, modelName]);

	const [status, setStatus] = useState<ModelStatus>(calculateStatus);

	useEffect(() => {
		setStatus(calculateStatus());

		const interval = setInterval(() => {
			setStatus(calculateStatus());
		}, 5000);

		return () => clearInterval(interval);
	}, [calculateStatus]);

	return status;
}

const statusConfig: Record<
	ModelStatus,
	{
		badgeContent: React.ReactNode;
		tooltip: string;
		variant?: "secondary";
		className?: string;
	}
> = {
	online: {
		badgeContent: (
			<>
				<Circle className="absolute animate-ping w-2 h-2 top-1 left-2 opacity-50 rounded-full fill-current text-green-500" />
				<Circle className="w-2 h-2 fill-current text-green-500" />
				online
			</>
		),
		tooltip: "Model is loaded and ready to use. Will be unloaded after ~1 minutes of inactivity.",
		className: "relative",
	},
	sleeping: {
		badgeContent: (
			<>
				<Circle className="absolute animate-ping w-2 h-2 top-1 left-2 opacity-50 rounded-full fill-current text-red-500" />
				<Circle className="w-2 h-2 fill-current text-red-500" />
				sleeping
			</>
		),
		tooltip: "Model is not loaded - will be loaded on first use and unloaded after ~1 minutes of inactivity.",
		className: "relative",
	},
	loading: {
		badgeContent: (
			<>
				<Loader2 className="w-2 h-2 animate-spin text-blue-500" />
				loading
			</>
		),
		tooltip: "Model is currently being loaded. This can take a few minutes!",
		variant: "secondary",
	},
};

const ModelStatusBadge = ({ status, isMutating }: { status: ModelStatus; isMutating: boolean }) => {
	const displayStatus = isMutating || status === "loading" ? "loading" : status;
	const config = statusConfig[displayStatus];

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Badge variant={config.variant} className={`flex items-center gap-1 ${config.className || ""}`}>
					{config.badgeContent}
				</Badge>
			</TooltipTrigger>
			<TooltipContent>{config.tooltip}</TooltipContent>
		</Tooltip>
	);
};
export default function LogitLens() {
	const [input, setInput] = useState("Tom Cruise stars in the movie Mission");
	const [modelName, setModelName] = useState("gpt2-small");
	const [currentText, setCurrentText] = useState("");

	const {
		data: loadedModels,
		isLoading: isLoadingModels,
		refetch: refetchLoadedModels,
	} = useQuery({
		queryKey: ["loadedModels"],
		queryFn: fetchLoadedModels,
		refetchInterval: 5000,
		staleTime: 0,
	});

	const mutation = useMutation({
		mutationFn: postLogitLens,
		onSuccess: () => {
			refetchLoadedModels();
		},
	});

	const { data: availableModels } = useQuery({
		initialData: ["gpt2-small"],
		queryKey: ["availableModels"],
		queryFn: fetchAvailableModels,
	});

	const selectedModelStatus = useModelStatus(modelName, loadedModels, isLoadingModels);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setCurrentText(input);
		mutation.mutate({ model_name: modelName, input });
	};

	const handleNextToken = () => {
		if (mutation.data?.most_likely_token) {
			const newText = currentText + mutation.data.most_likely_token;
			setCurrentText(newText);
			mutation.mutate({ model_name: modelName, input: newText });
		}
	};

	return (
		<div className="w-full flex justify-center min-h-screen p-8">
			<div className="flex flex-col gap-8 w-full max-w-4xl">
				<div className="flex flex-col gap4">
					<a
						className="pt-4 hover:cursor-pointer flex flex-row items-center gap-2 hover:underline hover:opacity-70"
						href="https://github.com/poweroutlet2/logitlens"
						target="_blank"
						rel="noopener noreferrer"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="32"
							height="32"
							className="fill-gray-600"
							viewBox="0 0 16 16"
						>
							<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
						</svg>
						GitHub
					</a>
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="description">
							<AccordionTrigger className="text-3xl font-bold hover:cursor-pointer">
								Logit Lens
							</AccordionTrigger>
							<AccordionContent className="text-base leading-relaxed">
								<p className="mb-4">
									Logit Lens is a basic technique for interpreting transformer models that examines
									what the model&apos;s output would be if predictions made at each layer of the
									network. Instead of only looking at the final output, it allows us to see what the
									model &quot;thinks&quot; the next token should be at every intermediate layer.
								</p>
								<p className="mb-4">
									This visualization shows how the model&apos;s predictions evolve as information
									flows through the layers. Each row represents a layer in the transformer, and each
									column represents a token position in the input sequence. The colors and text show
									the most likely next token predicted at each layer and position.
								</p>
								<p>
									Begin by selecting a model and entering some text. The model will predict the next
									token, and you can click the &quot;Next Token&quot; button to see the next token.
									The heatmap will show the most likely next token at each layer and position.
								</p>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div>
						<Label htmlFor="modelName" className="block text-sm font-medium">
							Model Name
						</Label>
						<div className="flex items-center gap-2">
							<Select value={modelName} onValueChange={setModelName}>
								<SelectTrigger className="hover:cursor-pointer">
									<SelectValue placeholder="Select a model" />
								</SelectTrigger>
								<SelectContent>
									{availableModels?.map((model) => {
										return (
											<SelectItem key={model} value={model}>
												<div className="flex items-center gap-2">{model}</div>
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
							<ModelStatusBadge status={selectedModelStatus} isMutating={mutation.isPending} />
						</div>
					</div>
					<div>
						<Label htmlFor="input" className="block text-sm font-medium">
							Input Text
						</Label>
						<Textarea
							id="input"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
						/>
					</div>

					<Button
						type="submit"
						className="inline-flex max-w-md justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
						disabled={mutation.isPending}
					>
						{mutation.isPending ? "Loading..." : "Submit"}
					</Button>
				</form>

				{mutation.isError && <div className="text-red-500">An error occurred: {mutation.error.message}</div>}

				<div
					className={`transition-opacity duration-200 justify-self-center self-center ${
						mutation.isPending ? "opacity-50 pointer-events-none" : "opacity-100"
					}`}
				>
					<Separator className="mb-10" />
					{mutation.data && (
						<>
							<div>
								<h3 className="text-lg font-semibold px-8">
									{currentText}
									<span className="bg-blue-200 rounded-sm p-1">
										{mutation.data.most_likely_token}
									</span>
									<Button className="ml-2" onClick={handleNextToken} disabled={mutation.isPending}>
										{mutation.isPending ? "Loading..." : "Next Token"}
										<ArrowRight />
									</Button>
								</h3>
							</div>
							<div className={`transition-opacity duration-200`}>
								<Heatmap data={mutation.data.logit_lens} input_tokens={mutation.data.input_tokens} />
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
