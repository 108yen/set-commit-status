import { afterEach, describe, expect, test, vi } from "vitest"

import { main } from "../src/index"

describe("index", () => {
  const mock = vi.hoisted(() => ({
    context: {
      repo: {
        owner: "owner",
        repo: "repo",
      },
    },
    createCommitStatus: vi.fn(),
    getInput: vi.fn(),
    github: vi.fn(),
    setFailed: vi.fn(),
    setupOctokit: vi.fn(),
  }))

  vi.mock("@actions/core", async (actual) => ({
    ...(await actual<typeof import("@actions/core")>()),
    getInput: mock.getInput,
    setFailed: mock.setFailed,
  }))

  vi.mock("@actions/github", async (actual) => ({
    ...(await actual<typeof import("@actions/github")>()),
    context: mock.context,
  }))

  vi.mock("../src/utils", async (actual) => ({
    ...(await actual<typeof import("../src/utils")>()),
    setupOctokit: mock.setupOctokit,
  }))

  afterEach(() => {
    delete process.env.GITHUB_RUN_ID
    delete process.env.GITHUB_TOKEN
  })

  test("Call request correctly", async () => {
    const input = {
      context: "workflow context",
      description: "workflow description",
      job_id: "workflow_job_id",
      sha: "commit_hash",
      status: "success",
    }

    mock.getInput.mockImplementation((value) => input[value])
    mock.setupOctokit.mockReturnValue({
      rest: { repos: { createCommitStatus: mock.createCommitStatus } },
    })

    process.env.GITHUB_RUN_ID = "run_id"
    process.env.GITHUB_TOKEN = "xxx"

    await main()

    expect(mock.setupOctokit).toBeCalledWith("xxx")

    expect(mock.createCommitStatus).toBeCalledTimes(1)
    expect(mock.createCommitStatus).toBeCalledWith({
      allowForks: false,
      context: input.context,
      description: input.description,
      owner: "owner",
      repo: "repo",
      sha: input.sha,
      state: input.status,
      target_url:
        "https://github.com/owner/repo/actions/runs/run_id/job/workflow_job_id",
    })
  })

  test("Use `github_token` when passed as input", async () => {
    const input = {
      context: "workflow context",
      description: "workflow description",
      github_token: "input_token",
      job_id: "workflow_job_id",
      sha: "commit_hash",
      status: "success",
    }

    mock.getInput.mockImplementation((value) => input[value])
    mock.setupOctokit.mockReturnValue({
      rest: { repos: { createCommitStatus: mock.createCommitStatus } },
    })

    process.env.GITHUB_RUN_ID = "run_id"
    process.env.GITHUB_TOKEN = "xxx"

    await main()

    expect(mock.setupOctokit).toBeCalledWith(input.github_token)

    expect(mock.createCommitStatus).toBeCalledTimes(1)
    expect(mock.createCommitStatus).toBeCalledWith({
      allowForks: false,
      context: input.context,
      description: input.description,
      owner: "owner",
      repo: "repo",
      sha: input.sha,
      state: input.status,
      target_url:
        "https://github.com/owner/repo/actions/runs/run_id/job/workflow_job_id",
    })
  })

  describe("Target url", () => {
    test("`target_url` is change correctly if run id not passed", async () => {
      const input = {
        context: "workflow context",
        description: "workflow description",
        github_token: "input_token",
        job_id: "workflow_job_id",
        sha: "commit_hash",
        status: "success",
      }

      mock.getInput.mockImplementation((value) => input[value])
      mock.setupOctokit.mockReturnValue({
        rest: { repos: { createCommitStatus: mock.createCommitStatus } },
      })

      process.env.GITHUB_TOKEN = "xxx"

      await main()

      expect(mock.setupOctokit).toBeCalledWith(input.github_token)

      expect(mock.createCommitStatus).toBeCalledTimes(1)
      expect(mock.createCommitStatus).toBeCalledWith({
        allowForks: false,
        context: input.context,
        description: input.description,
        owner: "owner",
        repo: "repo",
        sha: input.sha,
        state: input.status,
        target_url: "https://github.com/owner/repo/actions",
      })
    })

    test("`target_url` is change correctly if job id not passed", async () => {
      const input = {
        context: "workflow context",
        description: "workflow description",
        github_token: "input_token",
        sha: "commit_hash",
        status: "success",
      }

      mock.getInput.mockImplementation((value) => input[value])
      mock.setupOctokit.mockReturnValue({
        rest: { repos: { createCommitStatus: mock.createCommitStatus } },
      })

      process.env.GITHUB_TOKEN = "xxx"
      process.env.GITHUB_RUN_ID = "run_id"

      await main()

      expect(mock.setupOctokit).toBeCalledWith(input.github_token)

      expect(mock.createCommitStatus).toBeCalledTimes(1)
      expect(mock.createCommitStatus).toBeCalledWith({
        allowForks: false,
        context: input.context,
        description: input.description,
        owner: "owner",
        repo: "repo",
        sha: input.sha,
        state: input.status,
        target_url: "https://github.com/owner/repo/actions/runs/run_id",
      })
    })
  })

  describe("Input check error works correctly", () => {
    test("Error when github token does not pass", async () => {
      const input = {
        context: "workflow context",
        description: "workflow description",
        job_id: "workflow_job_id",
        sha: "commit_hash",
        status: "success",
      }

      mock.getInput.mockImplementation((value) => input[value])
      mock.setupOctokit.mockReturnValue({
        rest: { repos: { createCommitStatus: mock.createCommitStatus } },
      })

      process.env.GITHUB_RUN_ID = "run_id"

      await main()

      expect(mock.setFailed).toBeCalledWith("Please add the GITHUB_TOKEN")
      expect(mock.createCommitStatus).not.toBeCalled()
    })

    test("Error when unexpected state", async () => {
      const input = {
        context: "workflow context",
        description: "workflow description",
        job_id: "workflow_job_id",
        sha: "commit_hash",
        status: "unexpected_status",
      }

      mock.getInput.mockImplementation((value) => input[value])
      mock.setupOctokit.mockReturnValue({
        rest: { repos: { createCommitStatus: mock.createCommitStatus } },
      })

      process.env.GITHUB_RUN_ID = "run_id"
      process.env.GITHUB_TOKEN = "xxx"

      await main()

      expect(mock.setFailed).toBeCalledWith(
        'Unexpected state value. State value need to be ("error", "failure", "pending", "success")',
      )
      expect(mock.createCommitStatus).not.toBeCalled()
    })
  })
})
