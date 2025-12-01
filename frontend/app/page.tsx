import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "../components/theme-toggle";

export default function Home() {
	return (
		<div className="w-full flex justify-center min-h-screen p-8 relative">
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>
			<div className="flex flex-col gap-4">
				<span>Hi! I&apos;m Harsh! Here are some interactive mechinterp demos.</span>
				<Link href="/logitlens" className="hover:underline flex flex-row items-center gap-2 w-fit">
					LogitLens
					<ArrowRight className="size-4" />
				</Link>
				<Link href="/steering-demo" className="hover:underline flex flex-row items-center gap-2 w-fit">
					Steering Demo
					<ArrowRight className="size-4" />
				</Link>
				<Link
					href="https://github.com/poweroutlet2"
					className="hover:underline flex flex-row items-center gap-2 w-fit"
				>
					My Github
					<ArrowRight className="size-4" />
				</Link>
			</div>
		</div>
	);
}
