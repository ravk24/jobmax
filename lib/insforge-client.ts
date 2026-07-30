import { createBrowserClient } from "@insforge/sdk/ssr";

import { getInsforgeUrl } from "@/lib/auth";

export const insforge = createBrowserClient({ baseUrl: getInsforgeUrl() });
