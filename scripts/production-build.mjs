import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Hostinger kills the build when a native compiler starts one thread per CPU.
process.env.TOKIO_WORKER_THREADS ??= "1";
process.env.RAYON_NUM_THREADS ??= "1";
process.env.UV_THREADPOOL_SIZE ??= "2";

const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build", "--webpack"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
