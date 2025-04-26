import { isCommitState } from "src/utils"
import { describe, expect, test } from "vitest"

describe("utils", () => {
  describe("isCommitState", () => {
    test.each([
      { value: "success" },
      { value: "pending" },
      { value: "failure" },
      { value: "error" },
    ])("Return true when value match", ({ value }) =>
      expect(isCommitState(value)).toBeTruthy(),
    )

    test("Return false then value not match", () =>
      expect(isCommitState("xxx")).toBeFalsy())
  })
})
