"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Circle, Loader2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type ModelStatus = "online" | "sleeping" | "loading";

interface LoadedModelsResponse {
	[model_name: string]: string; // model_name -> loaded_timestamp
}

async function fetchLoadedModels(): Promise<LoadedModelsResponse> {
	const response = await fetch(`${API_BASE_URL}/loaded_models`);

	if (!response.ok) {
		throw new Error("Failed to fetch loaded models");
	}

	return response.json();
}

async function fetchAvailableModels(endpoint: string = "available_models"): Promise<string[]> {
	const response = await fetch(`${API_BASE_URL}/${endpoint}`);

	if (!response.ok) {
		throw new Error("Failed to fetch available models");
	}

	return response.json();
}

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

		// Models are automatically unloaded after ~90 seconds
		return diffInSeconds > 90 ? "sleeping" : "online";
	}, [isLoadingModels, loadedModels, modelName]);

	const [status, setStatus] = useState<ModelStatus>(calculateStatus);

	useEffect(() => {
		setStatus(calculateStatus());

		const interval = setInterval(() => {
			setStatus(calculateStatus());
		}, 10000);

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
		tooltip: "Model is currently being loaded. This can take a couple minutes on cold start.",
		variant: "secondary",
	},
};

const ModelStatusBadge = ({ status, isMutating }: { status: ModelStatus; isMutating: boolean }) => {
	const displayStatus = status === "loading" || (isMutating && status === "sleeping") ? "loading" : status;
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

interface ModelSelectorProps {
	modelName: string;
	onModelChange: (modelName: string) => void;
	isMutating?: boolean;
	availableModelsEndpoint?: string;
}

export default function ModelSelector({
	modelName,
	onModelChange,
	isMutating = false,
	availableModelsEndpoint = "available_models",
}: ModelSelectorProps) {
	const { data: loadedModels, isLoading: isLoadingModels } = useQuery({
		queryKey: ["loadedModels"],
		queryFn: fetchLoadedModels,
		refetchInterval: 5000,
		staleTime: 0,
	});

	const { data: availableModels } = useQuery({
		queryKey: ["availableModels", availableModelsEndpoint],
		queryFn: () => fetchAvailableModels(availableModelsEndpoint),
	});

	// Auto-select the first available model when models are loaded
	useEffect(() => {
		if (availableModels && availableModels.length > 0) {
			// If no model is selected or current model is not in available models, select the first one
			if (!modelName || !availableModels.includes(modelName)) {
				onModelChange(availableModels[0]);
			}
		}
	}, [availableModels, modelName, onModelChange]);

	const selectedModelStatus = useModelStatus(modelName, loadedModels, isLoadingModels);

	return (
		<div>
			<Label htmlFor="modelName" className="block text-sm font-medium">
				Model Name
			</Label>
			<div className="flex items-center gap-2">
				<Select value={modelName} onValueChange={onModelChange}>
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
				<ModelStatusBadge status={selectedModelStatus} isMutating={isMutating} />
			</div>
		</div>
	);
}
