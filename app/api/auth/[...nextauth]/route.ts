import { handlers } from "@/lib/auth";

export const runtime = "nodejs"; // ← ADD THIS LINE

export const { GET, POST } = handlers;
