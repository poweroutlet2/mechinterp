"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import Heatmap from "./Heatmap";
import { Separator } from "../separator";

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

async function postLogitLens(request: LogitLensRequest): Promise<LogitLensResponse> {
	const response = await fetch("http://localhost:8000/logitlens", {
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

export default function LogitLens() {
	const [input, setInput] = useState("The capital of France is");
	const [modelName, setModelName] = useState("gpt2-small");
	const [currentText, setCurrentText] = useState("");

	const mutation = useMutation({
		mutationFn: postLogitLens,
	});

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
		<div className="flex flex-col gap-16 w-full max-w-4xl">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div>
					<Label htmlFor="modelName" className="block text-sm font-medium">
						Model Name
					</Label>
					<Select value={modelName} onValueChange={setModelName}>
						<SelectTrigger className="hover:cursor-pointer">
							<SelectValue placeholder="Select a model" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="gpt2-small">gpt2-small</SelectItem>
							<SelectItem value="gpt2-medium">gpt2-medium</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div>
					<Label htmlFor="input" className="block text-sm font-medium">
						Input Text
					</Label>
					<Input
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
								<span className="bg-blue-200 rounded-sm p-1">{mutation.data.most_likely_token}</span>
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
	);
}
