import path from "path";

export function dataDir() {
  const override = process.env.DATA_DIR?.trim();
  if (override) return override;
  if (process.env.VERCEL) return path.join("/tmp", "couplesync");
  return path.join(process.cwd(), ".data");
}
