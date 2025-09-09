"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, Home, Loader2, Plus, X } from "lucide-react";
import ModelSelector from "../../components/model-selector";
import { useState } from "react";
import Link from "next/link";

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
	const [modelName, setModelName] = useState("gpt2-small");
	const [positivePrompts, setPositivePrompts] = useState<string[]>(["I love"]);
	const [negativePrompts, setNegativePrompts] = useState<string[]>(["I hate"]);
	const [steeringVectors, setSteeringVectors] = useState<SteeringVectors | null>(null);
	const [isGeneratingVectors, setIsGeneratingVectors] = useState(false);
	const [isRunningModel, setIsRunningModel] = useState(false);

	// Model steering parameters
	const [selectedLayer, setSelectedLayer] = useState<number>(6);
	const [scalingFactor, setScalingFactor] = useState<number>(1.0);
	const [maxTokens, setMaxTokens] = useState<number>(50);
	const [prompt, setPrompt] = useState<string>("I think");
	const [modelResults, setModelResults] = useState<RunWithSteeringResponse | null>(null);

	const addPositivePrompt = () => setPositivePrompts([...positivePrompts, ""]);
	const addNegativePrompt = () => setNegativePrompts([...negativePrompts, ""]);

	const removePositivePrompt = (index: number) => {
		if (positivePrompts.length > 1) {
			setPositivePrompts(positivePrompts.filter((_, i) => i !== index));
		}
	};

	const removeNegativePrompt = (index: number) => {
		if (negativePrompts.length > 1) {
			setNegativePrompts(negativePrompts.filter((_, i) => i !== index));
		}
	};

	const updatePositivePrompt = (index: number, value: string) => {
		const updated = [...positivePrompts];
		updated[index] = value;
		setPositivePrompts(updated);
	};

	const updateNegativePrompt = (index: number, value: string) => {
		const updated = [...negativePrompts];
		updated[index] = value;
		setNegativePrompts(updated);
	};

	const generateSteeringVectors = async () => {
		setIsGeneratingVectors(true);
		try {
			const response = await fetch(`${API_BASE_URL}/steering/calculate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model_name: modelName,
					positive_prompts: positivePrompts.filter((p) => p.trim() !== ""),
					negative_prompts: negativePrompts.filter((p) => p.trim() !== ""),
				}),
			});

			if (!response.ok) throw new Error("Failed to generate steering vectors");

			const data: SteeringVectorResponse = await response.json();
			setSteeringVectors(data.steering_vectors);
		} catch (error) {
			console.error("Error generating steering vectors:", error);
		} finally {
			setIsGeneratingVectors(false);
		}
	};

	const runWithSteering = async () => {
		if (!steeringVectors) return;

		setIsRunningModel(true);
		setModelResults(null);

		try {
			const response = await fetch(`${API_BASE_URL}/steering/run_with_steering`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model_name: modelName,
					prompt: [prompt],
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
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="description">
							<AccordionTrigger className="text-3xl font-bold hover:cursor-pointer">
								Steering Vectors Demo
							</AccordionTrigger>
							<AccordionContent className="text-base leading-relaxed">
								<p className="mb-4">
									Steering vectors are a technique for controlling the behavior of language models by
									adding specific directions to the model&apos;s internal representations. This allows
									you to encourage certain behaviors (like being more positive) or discourage others.
								</p>
								<p className="mb-4">
									First, generate steering vectors by providing examples of desired behavior (positive
									prompts) and undesired behavior (negative prompts). Then use those vectors to steer
									the model&apos;s output when generating text.
								</p>
								<p>
									Select a model, create your steering vectors, and then see how they affect the
									model&apos;s responses compared to the unsteered baseline.
								</p>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>

				<ModelSelector modelName={modelName} onModelChange={setModelName} />

				{/* Steering Vector Generation Section */}
				<div className="border rounded-lg p-6 bg-white shadow-sm">
					<div className="mb-6">
						<h3 className="text-xl font-semibold mb-2">Generate Steering Vector</h3>
						<p className="text-gray-600">
							Create a steering vector by providing positive and negative example prompts
						</p>
					</div>
					<div className="space-y-6">
						<div className="space-y-4">
							<div>
								<Label className="text-sm font-medium">
									Positive Prompts (encourage this behavior)
								</Label>
								<div className="space-y-2 mt-2">
									{positivePrompts.map((prompt, index) => (
										<div key={index} className="flex gap-2 items-center">
											<Textarea
												value={prompt}
												onChange={(e) => updatePositivePrompt(index, e.target.value)}
												placeholder="Enter a prompt that encourages the desired behavior..."
												className="flex-1"
												rows={2}
											/>
											{positivePrompts.length > 1 && (
												<Button
													variant="outline"
													size="icon"
													onClick={() => removePositivePrompt(index)}
												>
													<X className="h-4 w-4" />
												</Button>
											)}
										</div>
									))}
									<Button variant="outline" onClick={addPositivePrompt} className="w-full">
										<Plus className="h-4 w-4 mr-2" />
										Add Positive Prompt
									</Button>
								</div>
							</div>

							<div>
								<Label className="text-sm font-medium">
									Negative Prompts (discourage this behavior)
								</Label>
								<div className="space-y-2 mt-2">
									{negativePrompts.map((prompt, index) => (
										<div key={index} className="flex gap-2 items-center">
											<Textarea
												value={prompt}
												onChange={(e) => updateNegativePrompt(index, e.target.value)}
												placeholder="Enter a prompt that shows the opposite behavior..."
												className="flex-1"
												rows={2}
											/>
											{negativePrompts.length > 1 && (
												<Button
													variant="outline"
													size="icon"
													onClick={() => removeNegativePrompt(index)}
												>
													<X className="h-4 w-4" />
												</Button>
											)}
										</div>
									))}
									<Button variant="outline" onClick={addNegativePrompt} className="w-full">
										<Plus className="h-4 w-4 mr-2" />
										Add Negative Prompt
									</Button>
								</div>
							</div>
						</div>

						<Button
							onClick={generateSteeringVectors}
							disabled={
								isGeneratingVectors ||
								positivePrompts.some((p) => !p.trim()) ||
								negativePrompts.some((p) => !p.trim())
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
														Run Model with Steering
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
