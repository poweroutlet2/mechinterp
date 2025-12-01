"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export default function Providers({ children }: PropsWithChildren) {
	const [queryClient] = useState(() => new QueryClient());

	return (
		<NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</NextThemesProvider>
	);
}
