"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, ArrowRight, Home, Loader2, Plus, X } from "lucide-react";
import ModelSelector from "../../components/model-selector";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { fetchSteeringPresets } from "./presets";

type Preset = {
	id: string;
	name: string;
	description?: string;
	user_prompts: string[];
	positive_responses: string[];
	negative_responses: string[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface SteeringVectors {
	[layer: number]: number[];
}

interface SteeringVectorResponse {
	steering_vectors: SteeringVectors;
}

interface RunWithSteeringResponse {
	steered_response: string;
	unsteered_response: string;
}

export default function SteeringDemo() {
	const [modelName, setModelName] = useState("");
	const [userPrompts, setUserPrompts] = useState<string[]>(["What do you think about cats?"]);
	const [positiveResponses, setPositiveResponses] = useState<string[]>([
		"I love cats! They're wonderful companions.",
	]);
	const [negativeResponses, setNegativeResponses] = useState<string[]>(["I hate cats. They're annoying animals."]);
	const [steeringVectors, setSteeringVectors] = useState<SteeringVectors | null>(null);
	const [isGeneratingVectors, setIsGeneratingVectors] = useState(false);
	const [isRunningModel, setIsRunningModel] = useState(false);

	// Presets
	const [presets, setPresets] = useState<Preset[]>([]);
	const [selectedPresetId, setSelectedPresetId] = useState<string>("");
	const [presetsLoading, setPresetsLoading] = useState<boolean>(false);
	const [presetsError, setPresetsError] = useState<string | null>(null);

	// Steering parameters
	const [selectedLayer, setSelectedLayer] = useState<number>(9);
	const [scalingFactor, setScalingFactor] = useState<number>(5.0);
	const [maxTokens, setMaxTokens] = useState<number>(50);
	const [prompt, setPrompt] = useState<string>(
		"I'm pretty sure that 2+2=5, right? Could you explain why that's correct?"
	);
	const [modelResults, setModelResults] = useState<RunWithSteeringResponse | null>(null);

	const queryClient = useQueryClient();

	const removeUserPrompt = (index: number) => {
		if (userPrompts.length > 1) {
			setUserPrompts(userPrompts.filter((_, i) => i !== index));
			// Also remove corresponding responses
			setPositiveResponses(positiveResponses.filter((_, i) => i !== index));
			setNegativeResponses(negativeResponses.filter((_, i) => i !== index));
		}
	};

	const updateUserPrompt = (index: number, value: string) => {
		const updated = [...userPrompts];
		updated[index] = value;
		setUserPrompts(updated);
	};

	const updatePositiveResponse = (index: number, value: string) => {
		const updated = [...positiveResponses];
		updated[index] = value;
		setPositiveResponses(updated);
	};

	const updateNegativeResponse = (index: number, value: string) => {
		const updated = [...negativeResponses];
		updated[index] = value;
		setNegativeResponses(updated);
	};

	const addPromptResponsePair = () => {
		if (userPrompts.length < 10) {
			setUserPrompts([...userPrompts, ""]);
			setPositiveResponses([...positiveResponses, ""]);
			setNegativeResponses([...negativeResponses, ""]);
		}
	};

	// Load presets
	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				setPresetsLoading(true);
				const data = await fetchSteeringPresets();
				if (isMounted) setPresets(data as unknown as Preset[]);
			} catch {
				if (isMounted) setPresetsError("Failed to load presets");
			} finally {
				if (isMounted) setPresetsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	// Apply preset selection (overwrite prompts)
	const handlePresetSelect = (id: string) => {
		setSelectedPresetId(id);
		const preset = presets.find((p) => p.id === id);
		if (!preset) return; // "None" selected, do not overwrite
		setUserPrompts(preset.user_prompts.slice(0, 10));
		setPositiveResponses(preset.positive_responses.slice(0, 10));
		setNegativeResponses(preset.negative_responses.slice(0, 10));
	};

	const generateSteeringVectors = async () => {
		setIsGeneratingVectors(true);
		// Prompt a refresh of loaded models to reflect potential loading state
		queryClient.invalidateQueries({ queryKey: ["loadedModels"] });
		try {
			const response = await fetch(`${API_BASE_URL}/steering/calculate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model_name: modelName,
					user_prompts: userPrompts.filter((p) => p.trim() !== ""),
					assistant_positive_responses: positiveResponses.filter((p) => p.trim() !== ""),
					assistant_negative_responses: negativeResponses.filter((p) => p.trim() !== ""),
				}),
			});

			if (!response.ok) throw new Error("Failed to generate steering vectors");

			const data: SteeringVectorResponse = await response.json();
			setSteeringVectors(data.steering_vectors);
		} catch (error) {
			console.error("Error generating steering vectors:", error);
		} finally {
			setIsGeneratingVectors(false);
			// Refresh loaded models again to capture any model load completion
			queryClient.invalidateQueries({ queryKey: ["loadedModels"] });
		}
	};

	const runWithSteering = async () => {
		if (!steeringVectors) return;

		setIsRunningModel(true);
		setModelResults(null);
		// Prompt a refresh of loaded models to reflect potential loading state
		queryClient.invalidateQueries({ queryKey: ["loadedModels"] });

		try {
			const response = await fetch(`${API_BASE_URL}/steering/run_with_steering`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model_name: modelName,
					prompt: prompt,
					steering_vectors: steeringVectors,
					layer: selectedLayer,
					scaling_factor: scalingFactor,
					max_tokens: maxTokens,
				}),
			});

			if (!response.ok) throw new Error("Failed to run model with steering");

			const data: RunWithSteeringResponse = await response.json();
			setModelResults(data);
		} catch (error) {
			console.error("Error running model with steering:", error);
		} finally {
			setIsRunningModel(false);
			// Refresh loaded models again to capture any model load completion
			queryClient.invalidateQueries({ queryKey: ["loadedModels"] });
		}
	};

	return (
		<div className="w-full flex justify-center min-h-screen p-8">
			<Link href="/" className="text-gray-600 hover:text-gray-900 absolute top-4 left-4">
				<Home className="size-6" />
			</Link>

			<div className="flex flex-col gap-8 w-full max-w-4xl">
				<div className="flex flex-col gap-4">
					<a
						className="pt-4 hover:cursor-pointer flex flex-row items-center gap-2 hover:underline hover:opacity-70"
						href="https://github.com/poweroutlet2/mechinterp"
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
						Source Code
					</a>
					<Accordion type="single" collapsible className="w-full" defaultValue="description">
						<AccordionItem value="description">
							<AccordionTrigger className="text-3xl font-bold hover:cursor-pointer">
								Steering Vectors Demo
							</AccordionTrigger>
							<AccordionContent className="text-base leading-relaxed">
								<p className="mb-4">
									Steering vectors are a technique for controlling the behavior of language models by
									adding specific directions to the model&apos;s internal representations. This allows
									you to encourage certain behaviors (like being more humorous) without fine-tuning!
								</p>

								<Alert className="mb-4 border-amber-200 bg-amber-50">
									<AlertTriangle className="h-4 w-4 text-amber-600" />
									<AlertTitle className="text-amber-800">Disclaimer</AlertTitle>
									<AlertDescription className="text-amber-700">
										Steering vectors don&apos;t perfectly capture behaviors and are not guaranteed
										to make the model act exactly as intended. They may also have unintended effects
										due to variability across inputs, potential biases from contrasting prompts, and
										limited generalization across different scenarios. This can also happen because
										of something called superposition. Basically, a single target behavior is
										probably not represented by simple linear directions in the model&apos;s
										activation space, so itcannot be perfectly represented by a steering vector.
									</AlertDescription>
								</Alert>

								<p className="mb-4">
									First, come up with user prompts and corresponding positive and negative assistant
									resposnes. The positive responses should be examples of how you want the model to
									behave, and the negative responses should be examples of either the opposite of how
									you want the model to behave or examples of normal responses. These will be used to
									calculate the steering vectors by taking the mean difference between the residual
									stream activations of the positive and negative responses after each layer.
								</p>
								<p>
									Then, enter a user prompt and see how the model responds to it. You can also change
									the layer and scaling factor to see how the steering vectors affect the model&apos;s
									responses.
								</p>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>

				<ModelSelector
					modelName={modelName}
					onModelChange={setModelName}
					isMutating={isGeneratingVectors || isRunningModel}
					availableModelsEndpoint="steering/available_models"
				/>

				{/* Steering Vector Generation Section */}
				<div className="border rounded-lg p-6 bg-white shadow-sm">
					<div className="mb-6">
						<h3 className="text-xl font-semibold mb-2">1. Generate Steering Vector</h3>
						<p className="text-gray-600">
							Create a steering vector by providing user prompts with corresponding positive and negative
							assistant responses. The positive responses should exemplify the desired behavior, and the
							negative responses should exemplify the opposite or undesired behavior. Check the presets
							for some examples!
						</p>
					</div>
					<div className="space-y-6">
						{/* Preset Selector */}
						<div className="grid grid-cols-1 gap-2 w-fit">
							<Label className="text-sm font-medium">Preset</Label>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<div>
											<Select
												value={selectedPresetId}
												onValueChange={handlePresetSelect}
												disabled={presetsLoading || !!presetsError}
											>
												<SelectTrigger className="hover:cursor-pointer">
													<SelectValue
														placeholder={
															presetsLoading
																? "Loading presets..."
																: presetsError
																? "Presets unavailable"
																: "Select a preset"
														}
													/>
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="none">None</SelectItem>
													{presets.map((p) => (
														<SelectItem key={p.id} value={p.id}>
															+{p.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<p>Selecting a preset will overwrite your current prompts.</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							{presetsError && <p className="text-xs text-gray-500">{presetsError}</p>}
						</div>
						<div className="space-y-4">
							<Label className="text-sm font-medium">
								Prompt-Response Pairs
								<span className="text-gray-500"> ({userPrompts.length}/10)</span>
							</Label>
							<div className="space-y-4 mt-2">
								<div className="max-h-96 overflow-y-auto pr-1">
									{userPrompts.map((userPrompt, index) => (
										<div
											key={index}
											className="border border-gray-200 rounded-lg p-4 mb-1 space-y-3"
										>
											<div className="flex gap-2 items-start">
												<div className="flex-1">
													<Label className="text-xs font-medium text-gray-600 mb-1 block">
														User Prompt {index + 1}
													</Label>
													<Textarea
														value={userPrompt}
														onChange={(e) => updateUserPrompt(index, e.target.value)}
														placeholder="Enter a user prompt..."
														className="text-sm"
														rows={2}
													/>
												</div>
												{userPrompts.length > 1 && (
													<Button
														variant="outline"
														size="icon"
														onClick={() => removeUserPrompt(index)}
														className="mt-5"
													>
														<X className="h-4 w-4" />
													</Button>
												)}
											</div>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
												<div>
													<Label className="text-xs font-medium text-green-700 mb-1 block">
														Positive Assistant Response
													</Label>
													<Textarea
														value={positiveResponses[index] || ""}
														onChange={(e) => updatePositiveResponse(index, e.target.value)}
														placeholder="Assistant response that shows desired behavior..."
														className="text-sm border-green-200 focus:border-green-300"
														rows={3}
													/>
												</div>
												<div>
													<Label className="text-xs font-medium text-red-700 mb-1 block">
														Negative Assistant Response
													</Label>
													<Textarea
														value={negativeResponses[index] || ""}
														onChange={(e) => updateNegativeResponse(index, e.target.value)}
														placeholder="Assistant response that shows undesired behavior..."
														className="text-sm border-red-200 focus:border-red-300"
														rows={3}
													/>
												</div>
											</div>
										</div>
									))}
								</div>
								<Button
									variant="outline"
									onClick={addPromptResponsePair}
									className="w-full"
									disabled={userPrompts.length >= 10}
								>
									<Plus className="h-4 w-4 mr-2" />
									Add Prompt-Response Pair
								</Button>
							</div>
						</div>

						<Button
							onClick={generateSteeringVectors}
							disabled={
								isGeneratingVectors ||
								userPrompts.some((p) => !p.trim()) ||
								positiveResponses.some((p) => !p.trim()) ||
								negativeResponses.some((p) => !p.trim())
							}
							className="w-full bg-indigo-600 text-white"
						>
							{isGeneratingVectors ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Generating Steering Vectors...
								</>
							) : (
								"Generate Steering Vectors"
							)}
						</Button>

						{steeringVectors && (
							<div className="p-4 bg-green-50 rounded-lg border border-green-200">
								<h4 className="font-medium text-green-800 mb-2">Steering Vectors Generated</h4>
								<p className="text-sm text-green-700">
									Generated vectors for {Object.keys(steeringVectors).length} layers. Apply them to
									the model below to see how they affect the model&apos;s output.
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Model Steering Section */}
				<div
					className={`border rounded-lg bg-white shadow-sm transition-all duration-300 ${
						!steeringVectors ? "opacity-50 bg-gray-50" : "opacity-100"
					}`}
				>
					<TooltipProvider>
						<Accordion type="single" collapsible value={steeringVectors ? "steering" : ""}>
							<AccordionItem value="steering" className="border-none">
								{!steeringVectors ? (
									<Tooltip>
										<TooltipTrigger asChild>
											<AccordionTrigger
												className="px-6 py-4 hover:no-underline text-gray-500 cursor-default"
												onClick={(e) => e.preventDefault()}
											>
												<div className="text-left">
													<h3 className="text-xl font-semibold mb-1">
														2. Run Model with Steering
													</h3>
													<p className="text-sm text-gray-400">
														Generate steering vectors first to unlock this section
													</p>
												</div>
											</AccordionTrigger>
										</TooltipTrigger>
										<TooltipContent className="h-8">
											<p>Generate a steering vector to continue</p>
										</TooltipContent>
									</Tooltip>
								) : (
									<AccordionTrigger className="px-6 py-4 hover:no-underline text-black hover:text-gray-700">
										<div className="text-left">
											<h3 className="text-xl font-semibold mb-1">Run Model with Steering</h3>
											<p className="text-sm text-gray-600">
												Use the generated steering vectors to influence the model&apos;s output
											</p>
										</div>
									</AccordionTrigger>
								)}
								<AccordionContent className="px-6 pb-6">
									<div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<Label htmlFor="layer">Layer to Apply Steering</Label>
												<Select
													value={selectedLayer.toString()}
													onValueChange={(value) => setSelectedLayer(parseInt(value))}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{Object.keys(steeringVectors || {}).map((layer) => (
															<SelectItem key={layer} value={layer}>
																Layer {layer}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>

											<div>
												<Label htmlFor="scaling">Scaling Factor</Label>
												<Input
													id="scaling"
													type="number"
													step="0.1"
													defaultValue={5.0}
													value={scalingFactor}
													onChange={(e) =>
														setScalingFactor(parseFloat(e.target.value) || 1.0)
													}
												/>
											</div>

											<div>
												<Label htmlFor="maxTokens">Max Tokens</Label>
												<Input
													id="maxTokens"
													type="number"
													value={maxTokens}
													onChange={(e) => setMaxTokens(parseInt(e.target.value) || 50)}
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="prompt">Prompt</Label>
											<Textarea
												id="prompt"
												value={prompt}
												onChange={(e) => setPrompt(e.target.value)}
												placeholder="Enter your prompt here..."
												rows={3}
											/>
										</div>

										<Button
											onClick={runWithSteering}
											disabled={isRunningModel || !prompt.trim()}
											className="w-full  bg-indigo-600 text-white"
										>
											{isRunningModel ? (
												<>
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													Running Model...
												</>
											) : (
												<>
													Run with Steering
													<ArrowRight className="h-4 w-4 ml-2" />
												</>
											)}
										</Button>

										{modelResults && (
											<div className="space-y-4">
												<Separator />
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
														<h4 className="font-medium text-blue-800 mb-2">
															Steered Response
														</h4>
														<p className="text-sm text-blue-900 whitespace-pre-wrap">
															{modelResults.steered_response}
														</p>
													</div>
													<div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
														<h4 className="font-medium text-gray-800 mb-2">
															Unsteered Response
														</h4>
														<p className="text-sm text-gray-900 whitespace-pre-wrap">
															{modelResults.unsteered_response}
														</p>
													</div>
												</div>
											</div>
										)}
									</div>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</TooltipProvider>
				</div>
			</div>
		</div>
	);
}
