// @ts-expect-error Prisma 5 ignores this newer configuration key at type-check time.
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
});
