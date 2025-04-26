import { describe, expect, test } from "vitest"

import { isCommitState } from "../src/utils"

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

  describe.skip("setupOctokit")
})
