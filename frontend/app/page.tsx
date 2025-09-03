import Link from "next/link";

export default function Home() {
	return (
		<div className="w-full flex flex justify-center min-h-screen p-8">
			<div className="flex flex-col gap-4">
				<span>Hi! I&apos;m Harsh</span>
				<Link href="https://github.com/poweroutlet2" className="hover:underline">
					GitHub
				</Link>
				<Link href="/logitlens" className="hover:underline">
					LogitLens
				</Link>
				<Link href="/asymmetric-steering-effects">Asymmetric Steering Effects </Link>
			</div>
		</div>
	);
}
