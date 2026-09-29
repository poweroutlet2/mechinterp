import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Privacy Policy | hpatel.dev",
	description: "Privacy policy for hpatel.dev and its associated OAuth client",
};

export default function Privacy() {
	return (
		<div className="w-full flex justify-center min-h-screen p-8">
			<div className="max-w-2xl flex flex-col gap-4">
				<h1 className="text-2xl font-bold">Privacy Policy</h1>
				<p>
					This site and its associated Google Cloud OAuth client
					(&quot;baker-creek-desktop&quot;) are for Harsh Patel&apos;s personal
					use.
				</p>
				<p>
					Personal CLI tools (rclone, gws) use this OAuth client to access
					Google Drive data belonging solely to the account owner. No data is
					collected, stored, transferred, sold, or shared with any third
					party. All data remains on the user&apos;s own devices and with
					Google&apos;s servers under the account owner&apos;s control.
				</p>
				<p>
					Contact:{" "}
					<a href="mailto:harshp2015i@gmail.com" className="hover:underline">
						harshp2015i@gmail.com
					</a>
				</p>
			</div>
		</div>
	);
}
