import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  LMNR_PROJECT_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
export { env };
export default env;
