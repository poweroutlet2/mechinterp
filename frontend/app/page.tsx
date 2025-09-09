import Link from "next/link";

export default function Home() {
	return (
		<div className="w-full flex justify-center min-h-screen p-8">
			<div className="flex flex-col gap-4">
				<span>Hi! I&apos;m Harsh! These are some interactive mechinterp demos.</span>
				<Link href="https://github.com/poweroutlet2" className="hover:underline">
					Source Code
				</Link>
				<Link href="/logitlens" className="hover:underline">
					LogitLens
				</Link>
				<Link href="/steering-demo"> Steering Demo </Link>
			</div>
		</div>
	);
}
