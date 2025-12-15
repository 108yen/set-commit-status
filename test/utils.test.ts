import { describe, expect, test, vi } from "vitest"

import { isCommitState, setupOctokit } from "../src/utils"

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

    test("Return false then value type is not string", () =>
      expect(isCommitState(0)).toBeFalsy())
  })

  describe("setupOctokit", () => {
    const mock = vi.hoisted(() => ({
      fetch: vi.fn(),
      getOctokitOptions: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }))

    vi.mock("@actions/core", async (actual) => ({
      ...(await actual<typeof import("@actions/core")>()),
      info: mock.info,
      warning: mock.warning,
    }))

    vi.mock("@actions/github/lib/utils", async (actual) => ({
      ...(await actual<typeof import("@actions/github/lib/utils")>()),
      getOctokitOptions: mock.getOctokitOptions,
    }))

    test("Request called correctly", async () => {
      const mockFetch = vi.fn()

      mock.getOctokitOptions.mockImplementation((token, opts) => ({
        ...opts,
        request: { fetch: mockFetch },
        token,
      }))

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 }),
      )

      const octokit = setupOctokit("token")

      const content = {
        allowForks: false,
        owner: "108yen",
        repo: "set-commit-status",
        sha: "xxxxx",
        state: "success",
      } as const

      await octokit.rest.repos.createCommitStatus(content)

      expect(mockFetch).toBeCalledTimes(1)
      expect(mockFetch).toBeCalledWith(
        `https://api.github.com/repos/${content.owner}/${content.repo}/statuses/${content.sha}`,
        {
          body: `{"allowForks":${content.allowForks},"state":"${content.state}"}`,
          duplex: "half",
          headers: {
            accept: "application/vnd.github.v3+json",
            "content-type": "application/json; charset=utf-8",
            "user-agent": "octokit-core.js/5.2.1 Node.js/24",
          },
          method: "POST",
          redirect: undefined,
          signal: undefined,
        },
      )
    })

    describe("Rate limit", () => {
      test("Works correctly when github api rate limit", async () => {
        const mockFetch = vi.fn()

        mock.getOctokitOptions.mockImplementation((token, opts) => ({
          ...opts,
          request: { fetch: mockFetch },
          token,
        }))

        const headers = new Headers({
          "Retry-After": "60",
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": "1714138800",
        })
        const body = {
          documentation_url:
            "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting",
          message: "API rate limit exceeded for xxx.xxx.xxx.xxx.",
        }

        mockFetch
          .mockResolvedValueOnce(
            new Response(JSON.stringify(body), { headers, status: 429 }),
          )
          .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

        const octokit = setupOctokit("token")

        const content = {
          allowForks: false,
          owner: "108yen",
          repo: "set-commit-status",
          sha: "xxxxx",
          state: "success",
        } as const

        await octokit.rest.repos.createCommitStatus(content)

        expect(mockFetch).toBeCalledTimes(2)
        expect(mockFetch).toBeCalledWith(
          `https://api.github.com/repos/${content.owner}/${content.repo}/statuses/${content.sha}`,
          {
            body: `{"allowForks":${content.allowForks},"state":"${content.state}"}`,
            duplex: "half",
            headers: {
              accept: "application/vnd.github.v3+json",
              "content-type": "application/json; charset=utf-8",
              "user-agent": "octokit-core.js/5.2.1 Node.js/24",
            },
            method: "POST",
            redirect: undefined,
            signal: undefined,
          },
        )

        expect(mock.info).toBeCalledWith("Retrying after 0 seconds!")
        expect(mock.warning).toBeCalledWith(
          "Request quota exhausted for request POST /repos/{owner}/{repo}/statuses/{sha}",
        )
      })

      test("Error when github api rate limit 3 times", async () => {
        const mockFetch = vi.fn()

        mock.getOctokitOptions.mockImplementation((token, opts) => ({
          ...opts,
          request: { fetch: mockFetch },
          token,
        }))

        const headers = new Headers({
          "Retry-After": "60",
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": "1714138800",
        })
        const body = {
          documentation_url:
            "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting",
          message: "API rate limit exceeded for xxx.xxx.xxx.xxx.",
        }

        mockFetch.mockImplementation(
          async () =>
            new Response(JSON.stringify(body), { headers, status: 429 }),
        )

        const octokit = setupOctokit("token")

        const content = {
          allowForks: false,
          owner: "108yen",
          repo: "set-commit-status",
          sha: "xxxxx",
          state: "success",
        } as const

        await expect(() =>
          octokit.rest.repos.createCommitStatus(content),
        ).rejects.toThrowError(JSON.stringify(body))

        expect(mockFetch).toBeCalledTimes(4)
        expect(mockFetch).toBeCalledWith(
          `https://api.github.com/repos/${content.owner}/${content.repo}/statuses/${content.sha}`,
          {
            body: `{"allowForks":${content.allowForks},"state":"${content.state}"}`,
            duplex: "half",
            headers: {
              accept: "application/vnd.github.v3+json",
              "content-type": "application/json; charset=utf-8",
              "user-agent": "octokit-core.js/5.2.1 Node.js/24",
            },
            method: "POST",
            redirect: undefined,
            signal: undefined,
          },
        )

        expect(mock.info).toBeCalledTimes(3)
        expect(mock.info).toBeCalledWith("Retrying after 0 seconds!")
        expect(mock.warning).toBeCalledTimes(4)
        expect(mock.warning).toBeCalledWith(
          "Request quota exhausted for request POST /repos/{owner}/{repo}/statuses/{sha}",
        )
      })

      test("Works correctly when github api secondary rate limit", async () => {
        const mockFetch = vi.fn()

        mock.getOctokitOptions.mockImplementation((token, opts) => ({
          ...opts,
          request: { fetch: mockFetch },
          token,
        }))

        const headers = new Headers({
          "Retry-After": "1",
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": "1714138800",
        })
        const body = {
          documentation_url:
            "https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits",
          message:
            "You have exceeded a secondary rate limit and have been temporarily blocked from content creation. Please retry your request again later.",
        }

        mockFetch
          .mockResolvedValueOnce(
            new Response(JSON.stringify(body), { headers, status: 429 }),
          )
          .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

        const octokit = setupOctokit("token")

        const content = {
          allowForks: false,
          owner: "108yen",
          repo: "set-commit-status",
          sha: "xxxxx",
          state: "success",
        } as const

        await octokit.rest.repos.createCommitStatus(content)

        expect(mockFetch).toBeCalledTimes(2)
        expect(mockFetch).toBeCalledWith(
          `https://api.github.com/repos/${content.owner}/${content.repo}/statuses/${content.sha}`,
          {
            body: `{"allowForks":${content.allowForks},"state":"${content.state}"}`,
            duplex: "half",
            headers: {
              accept: "application/vnd.github.v3+json",
              "content-type": "application/json; charset=utf-8",
              "user-agent": "octokit-core.js/5.2.1 Node.js/24",
            },
            method: "POST",
            redirect: undefined,
            signal: undefined,
          },
        )

        expect(mock.info).toBeCalledWith("Retrying after 1 seconds!")
        expect(mock.warning).toBeCalledWith(
          "SecondaryRateLimit detected for request POST /repos/{owner}/{repo}/statuses/{sha}",
        )
      })

      test("Error when github api secondary rate limit 3 times", async () => {
        const mockFetch = vi.fn()

        mock.getOctokitOptions.mockImplementation((token, opts) => ({
          ...opts,
          request: { fetch: mockFetch },
          token,
        }))

        const headers = new Headers({
          "Retry-After": "1",
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": "1714138800",
        })
        const body = {
          documentation_url:
            "https://docs.github.com/rest/overview/resources-in-the-rest-api#secondary-rate-limits",
          message:
            "You have exceeded a secondary rate limit and have been temporarily blocked from content creation. Please retry your request again later.",
        }

        mockFetch.mockImplementation(
          async () =>
            new Response(JSON.stringify(body), { headers, status: 429 }),
        )

        const octokit = setupOctokit("token")

        const content = {
          allowForks: false,
          owner: "108yen",
          repo: "set-commit-status",
          sha: "xxxxx",
          state: "success",
        } as const

        await expect(() =>
          octokit.rest.repos.createCommitStatus(content),
        ).rejects.toThrowError(JSON.stringify(body))

        expect(mockFetch).toBeCalledTimes(4)
        expect(mockFetch).toBeCalledWith(
          `https://api.github.com/repos/${content.owner}/${content.repo}/statuses/${content.sha}`,
          {
            body: `{"allowForks":${content.allowForks},"state":"${content.state}"}`,
            duplex: "half",
            headers: {
              accept: "application/vnd.github.v3+json",
              "content-type": "application/json; charset=utf-8",
              "user-agent": "octokit-core.js/5.2.1 Node.js/24",
            },
            method: "POST",
            redirect: undefined,
            signal: undefined,
          },
        )

        expect(mock.info).toBeCalledTimes(3)
        expect(mock.info).toBeCalledWith("Retrying after 1 seconds!")
        expect(mock.warning).toBeCalledTimes(4)
        expect(mock.warning).toBeCalledWith(
          "SecondaryRateLimit detected for request POST /repos/{owner}/{repo}/statuses/{sha}",
        )
      })
    })
  })
})
