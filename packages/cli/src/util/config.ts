import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../../contracts/.env") });

export function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
