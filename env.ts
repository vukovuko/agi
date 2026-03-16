import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  DATABASE_URL: z.string().startsWith("postgresql://").optional(),
  LMNR_PROJECT_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Invalid environment variables:");
    const tree = z.treeifyError(error);
    console.error(JSON.stringify(tree, null, 2));
    process.exit(1);
  }
  throw error;
}

export { env };
export default env;
