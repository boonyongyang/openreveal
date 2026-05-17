import { migrate } from "./db.js";
import { cleanupExpiredData } from "./maintenance.js";

function retentionHoursFromArgs() {
  const arg = process.argv.find((value) => value.startsWith("--retention-hours="));
  if (!arg) return undefined;
  const parsed = Number.parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

await migrate();

const result = await cleanupExpiredData({
  retentionHours: retentionHoursFromArgs()
});

console.log(JSON.stringify(result, null, 2));
