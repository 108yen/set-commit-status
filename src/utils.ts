import * as core from "@actions/core"
import { getOctokitOptions, GitHub } from "@actions/github/lib/utils"
import { throttling } from "@octokit/plugin-throttling"

type CommitState = "error" | "failure" | "pending" | "success"

export function isCommitState(value: any): value is CommitState {
  if (typeof value !== "string") {
    return false
  }

  return ["error", "failure", "pending", "success"].includes(value)
}

export function setupOctokit(githubToken: string) {
  return new (GitHub.plugin(throttling))(
    getOctokitOptions(githubToken, {
      throttle: {
        onRateLimit: (retryAfter, options: any, octokit, retryCount) => {
          core.warning(
            `Request quota exhausted for request ${options.method} ${options.url}`,
          )

          if (retryCount <= 2) {
            core.info(`Retrying after ${retryAfter} seconds!`)
            return true
          }
        },
        onSecondaryRateLimit: (
          retryAfter,
          options: any,
          octokit,
          retryCount,
        ) => {
          core.warning(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
          )

          if (retryCount <= 2) {
            core.info(`Retrying after ${retryAfter} seconds!`)
            return true
          }
        },
      },
    }),
  )
}
