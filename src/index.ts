import * as core from "@actions/core"
import * as github from "@actions/github"
import { getOctokitOptions, GitHub } from "@actions/github/lib/utils"
import { throttling } from "@octokit/plugin-throttling"

type CommitState = "error" | "failure" | "pending" | "success"

function isCommitState(value: any): value is CommitState {
  if (typeof value !== "string") {
    return false
  }

  return ["error", "failure", "pending", "success"].includes(value)
}

async function main() {
  try {
    const state = core.getInput("status", { required: true })
    const sha = core.getInput("sha", { required: true })
    const context = core.getInput("context") || github.context.workflow
    const description = core.getInput("description")

    const { owner, repo } = github.context.repo
    const target_url = `https://github.com/${owner}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`

    const githubToken = process.env.GITHUB_TOKEN

    if (!githubToken) {
      console.log("Please add the GITHUB_TOKEN")
      return
    }

    if (!isCommitState(state)) {
      console.log(
        'Unexpected state value. State value need to be ("error", "failure", "pending", "success"),',
      )
      return
    }

    const octokit = setupOctokit(githubToken)

    await octokit.rest.repos.createCommitStatus({
      allowForks: false,
      context,
      description,
      owner,
      repo,
      sha,
      state,
      target_url,
    })
  } catch (error) {
    console.error(error as string)
    console.log("Unexpected error, something wrong.")
  }
}

function setupOctokit(githubToken: string) {
  return new (GitHub.plugin(throttling))(
    getOctokitOptions(githubToken, {
      throttle: {
        onRateLimit: (retryAfter, options: any, octokit, retryCount) => {
          console.warn(
            `Request quota exhausted for request ${options.method} ${options.url}`,
          )

          if (retryCount <= 2) {
            console.info(`Retrying after ${retryAfter} seconds!`)
            return true
          }
        },
        onSecondaryRateLimit: (
          retryAfter,
          options: any,
          octokit,
          retryCount,
        ) => {
          console.warn(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
          )

          if (retryCount <= 2) {
            console.info(`Retrying after ${retryAfter} seconds!`)
            return true
          }
        },
      },
    }),
  )
}

main()
