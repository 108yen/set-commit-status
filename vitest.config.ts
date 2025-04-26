import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      include: ["src/**"],
      provider: "v8",
    },
    include: ["./test/**"],
    mockReset: true,
    restoreMocks: true,
  },
})
