// lib/auth-user.ts
import { getAuthedUser } from "@/lib/auth";

export async function requireAppUser() {
    return getAuthedUser();
}
