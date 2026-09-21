---
title: "An Elixir project setup for the age of AI"
cover: "/img/elixir-tooling/cover.png"
tags: ["Elixir", "BEAM", "software", "AI", "agents"]
date: 2026-09-11T00:00:00+02:00
draft: true
featured: true
description: "The Mix defaults, quality checks, CI workflows, and agent instructions behind Fittr—and the Elixir AI Starter template extracted from them."
---

AI makes it easy to add code. I want my project setup to make it easy to question that code: does it fit the application, does it preserve behavior, and did we already have something that solves the problem?

Fittr, my personal fitness application (more on that in a future post), has become a place to work out that setup. It is a Phoenix LiveView project built with AI assistance, with ordinary Elixir tooling doing much of the checking. The interesting part is how those tools fit together: Mix gives the work a repeatable entry point, static analysis catches recurring mistakes, tests check behavior, and repository instructions give the agent local context.

I have extracted that workflow into [Elixir AI Starter](https://github.com/tgrk/elixir-ai-starter), a plain Elixir/OTP GitHub template with the quality tools, agent instructions, and CI configuration already connected. It provides a concrete starting point for the ideas in this post, with a separate guide for adopting the setup in Phoenix. The repository is currently private; the linked files require access.

<!--more-->

## Put the workflow in Mix

I want the same commands available to me, a contributor, and a coding agent. Fittr's main quality entry point is an alias in `mix.exs`:

```elixir
quality: ["format", "ex_dna", "credo --strict", "dialyzer"]
```

That is a small but useful contract. The agent does not have to reconstruct the quality process from previous conversations. Running `mix quality` formats the code, checks duplication, runs strict linting, and performs Dialyzer analysis.

The alias does **not** run tests or Sobelow. Fittr's `RULES.md` requires both `mix test` and `mix quality` before claiming an implementation is complete, and `AGENTS.md` calls for `mix sobelow` before release or deployment. Those are separate steps today.

The development setup is similarly explicit:

```sh
mix setup
mix assets.setup
mix phx.server
```

In this repository, `mix setup` only runs `deps.get`. Asset installation has its own alias. That detail matters when an agent assumes the name means everything a generated Phoenix project might put behind it. Read the alias before relying on it.

## Give each quality tool a distinct job

The quality dependencies in Fittr are restricted to development and test, with `runtime: false`. Here is the relevant selection from `mix.exs`:

```elixir
{:credo, "~> 1.7", only: [:dev, :test], runtime: false},
{:dialyxir, "~> 1.4", only: [:dev, :test], runtime: false},
{:sobelow, "~> 0.13", only: [:dev, :test], runtime: false},
{:styler, "~> 1.4", only: [:dev, :test], runtime: false},
{:ex_slop, "~> 0.4.0", only: [:dev, :test], runtime: false},
{:credo_results, "~> 0.1.0", only: [:dev, :test], runtime: false},
{:credo_unnecessary_reduce, "~> 0.4.0", only: [:dev, :test], runtime: false},
{:forge_credo_checks, "~> 0.4", only: [:dev, :test], runtime: false},
{:ex_dna, "~> 1.5", only: [:dev, :test], runtime: false}
```

This list grew around concrete kinds of feedback. I would introduce it in layers in a new project, starting with formatting, tests, Credo, and Dialyzer, then adding checks for mistakes that recur.

### Formatting should settle routine style decisions

Fittr uses Styler through the formatter configuration:

```elixir
[
  import_deps: [:phoenix],
  inputs: ["*.{heex,ex,exs}", "{config,lib,test}/**/*.{heex,ex,exs}"],
  plugins: [Styler]
]
```

[Styler](https://hexdocs.pm/styler/readme.html) extends the formatting pass with opinionated code rewrites. That gives generated code the same mechanical treatment as handwritten code. I can spend review time on behavior instead of repeatedly asking for the same style changes.

One consequence: `mix quality` changes files because it starts with `mix format`. Review the resulting diff. In CI, Fittr uses `mix format --check-formatted`, which checks committed formatting without repairing it.

### Credo carries the project's preferences

Fittr runs `credo --strict`, even though `.credo.exs` has `strict: false` as its default. The command is the stricter entry point.

Alongside standard Credo checks, the configuration explicitly enables `CredoResults.ConsistentResultCheck`, `CredoUnnecessaryReduce.Check`, and selected Forge checks. These cover result consistency, unnecessary reductions, and patterns such as building maps through a reduce or adding redundant control flow. The Forge result-tag check allows `:ok`, `:error`, and `:atomic`, reflecting the application's use of Mnesia transactions.

That last detail is what makes a lint configuration useful: it should understand the conventions the project actually needs. Enabling every available rule is not the objective.

### ExSlop catches some of the noise AI tends to add

[ExSlop](https://hexdocs.pm/ex_slop/readme.html) adds Credo checks for patterns such as blanket rescues, redundant result wrapping, and comments that narrate obvious operations. Fittr registers its plugin and appends its recommended checks to the explicit enabled list:

```elixir
plugins: [{ExSlop, []}],
checks: %{
  enabled:
    [
      {CredoResults.ConsistentResultCheck, []},
      {CredoUnnecessaryReduce.Check, []}
    ] ++ Enum.map(ExSlop.recommended_checks(), &{&1, []})
}
```

This is an abbreviated configuration; Fittr keeps its standard and Forge checks in that list too. The explicit append matters: ExSlop's documentation explains that an existing `checks.enabled` list takes precedence over checks registered by the plugin.

I think of these as review hints about code patterns, not a detector of who wrote the code. A clean result cannot establish that a feature is useful or that the architecture is appropriate.

### Duplication and types provide different feedback

[ExDNA](https://hexdocs.pm/ex_dna/readme.html) examines Elixir's syntax tree for duplication, including structurally similar code with renamed variables. Fittr runs it as `mix ex_dna`. That is useful when an agent creates a slightly different helper for each new page.

A duplication report still needs judgment. Similar-looking code can represent different domain rules. Before extracting a shared function, I want to know whether both callers should change together.

Dialyzer is another part of the alias, configured through Dialyxir with additional PLT applications and a warning-ignore file. Fittr's ignores include file-and-warning-category entries with explanations. They are exceptions to revisit, not evidence that the underlying concerns have disappeared. Adding an ignore merely to finish a task would weaken the feedback loop.

## Anti-slop also needs behavior and boundaries

The most expensive generated mistakes can look perfectly idiomatic. A test that repeats the implementation's assumptions may pass while a feature still does the wrong thing.

Fittr's repository rules make several expectations concrete:

- Domain work belongs in contexts; LiveViews handle interaction and UI state.
- Persistence goes through `Fittr.Storage`, with compatibility for existing records considered during changes.
- Expensive LiveView recomputations use async work, cancel superseded work, and clear loading state on both success and failure.
- Filter controls need accessible labels, and form-adjacent buttons need an explicit type.
- Focused tests support iteration; the final implementation gate includes the full test suite and quality command.

These are better instructions than asking an agent to write “clean, production-ready code.” They identify behavior a reviewer can check.

For a filter change, I would ask it to trace the event handler, context call, and async result handling; test the changed behavior; then check what happens if work fails or a newer filter selection arrives first. For a storage change, I would ask it to find the callers and explain what happens to existing records.

The test environment is part of that setup. Fittr points Mnesia at a temporary test directory and disables weather, AI, and caching for its next-session feature. Its test helper removes that test database before starting ExUnit. This keeps that path separate from ordinary application data, but the directory name is fixed: simultaneous test runs from multiple worktrees can interfere. A reusable setup should give independent runs separate storage directories.

## Give the agent access to the running application

Fittr includes Tidewave MCP as a development-only dependency:

```elixir
{:tidewave, "~> 0.1", only: :dev}
```

Its endpoint conditionally installs the plug:

```elixir
if Code.ensure_loaded?(Tidewave) do
  plug Tidewave
end
```

The repository instructions prefer Tidewave MCP for exploratory evaluation instead of `mix run`, while explicitly keeping tests and other Mix tasks in the workflow. That gives runtime exploration a defined place. A question about a running context can be investigated against the application rather than answered solely by reading source.

The repository demonstrates the server-side integration; it does not contain a portable client configuration that every reader can copy. Connecting an AI client is a separate setup step. Keep that access limited to the development environment and use deliberate, bounded evaluations, especially around persistence and external integrations.

Ordinary developer ergonomics still help too. Fittr's `.iex.exs` includes aliases for commonly used contexts and readable inspection settings. Runtime tools should also remain usable by the person reviewing the agent's work.

The starter makes this available without Phoenix: `mix tidewave` runs a development-only Bandit server on `127.0.0.1:4000`, with MCP at `/tidewave/mcp`. If that port is occupied, `TIDEWAVE_PORT=4001 mix tidewave` selects another. CI checks the MCP handshake, and the development dependencies stay out of the production release.

## Treat agent instructions as maintained documentation

Fittr has an `AGENTS.md` describing the project map, commands, domain responsibilities, caution areas, and collaboration rules. `RULES.md` records verification and LiveView conventions. Feature documents under `docs/` explain expected behavior in more detail.

There is also drift. `AGENTS.md` still describes Cachex persistence, while the implementation uses Mnesia. It mentions Mox although the inspected dependency list does not include it. A convincing instruction file can therefore send an agent toward an architecture or tool that is no longer present.

For a new project, I would keep the root instructions short: where code belongs, how to run it, how to verify it, and which operations can damage data. Put detailed feature decisions beside the project documentation and update the instructions when those decisions change.

Fittr also names reusable skills for debugging, testing, Elixir style, and reducing complexity. Those are useful workflow aids when installed, but machine-specific skill paths are not a portable project foundation. The essential commands and constraints should remain understandable from the repository itself.

## CI should enforce the same agreement

Fittr has separate Elixir and Dialyzer workflows. The Elixir workflow runs in `MIX_ENV=test`, installs dependencies, compiles with warnings treated as errors, checks formatting, and runs tests. The Dialyzer workflow maintains a PLT cache and runs `mix dialyzer --format github`.

The workflows cancel superseded runs and include a branch/PR check intended to avoid duplicate push and pull-request work. Dependency and build caches shorten feedback time; reruns of the Elixir job clean dependencies and build output to help rule out stale compilation.

There is a gap between local policy and CI:

| Check | Local setup | Committed CI workflows |
| --- | --- | --- |
| Formatting | `mix quality` rewrites files | Checks formatting |
| ExUnit | Separate `mix test` gate | Runs tests |
| Credo and its extensions | `mix quality` | Not run |
| ExDNA | `mix quality` | Not run |
| Dialyzer | `mix quality` | Separate workflow |
| Sobelow | Documented pre-release command | Not run |

The starter closes that gap with a non-mutating alias. This is its configuration, distinct from Fittr's existing command:

```elixir
"quality.check": [
  "format --check-formatted",
  "ex_dna",
  "credo --strict",
  "dialyzer",
  "sobelow --exit low"
],
verify: ["compile --warnings-as-errors", "test", "quality.check"]
```

`mix verify` is the same final check locally and in the starter's CI. It defaults to `MIX_ENV=test` through Mix's preferred CLI environments. The Sobelow exit option makes findings fail the command, so the scan contributes an enforceable check. `mix quality` remains available for formatting followed by analysis; it does not run the tests.

Fittr also configures weekly Dependabot updates for Mix dependencies and GitHub Actions, with grouped updates and an auto-merge workflow for eligible minor and patch changes. Whether merging is actually gated depends on repository settings and required checks, which these files alone do not establish. Automated updates deserve the same verification as an agent's patch.

The starter keeps the weekly updates and makes Dependabot auto-merge opt-in. Its [delivery guide](https://github.com/tgrk/elixir-ai-starter/blob/main/docs/delivery.md) explains the required repository settings; creating a repository from a template does not configure those settings for you.

## Release packaging is only part of delivery

Fittr defines asset build and deployment aliases, plus:

```elixir
"release.build": ["assets.deploy", "release"]
```

For a production release, the environment must be explicit:

```sh
MIX_ENV=prod mix release.build
```

The alias name does not switch Mix into production mode.

The repository also contains a multi-stage Dockerfile that builds a release and runs it as `nobody`, and a Fly.io configuration for serving the application. There is no deployment job in the inspected GitHub workflows, so I would describe this as CI plus release and hosting configuration, rather than automated continuous deployment.

There is another handoff to make explicit before reusing it: the Dockerfile copies `priv` and runs `mix release`, but does not copy the asset sources or run `mix assets.deploy`. It relies on the static assets supplied in the build context. A fresh project's delivery path should build those assets as part of a reproducible release process.

The starter has no frontend assets. Its release workflow runs verification, builds and smoke-tests a Linux release, and uploads the archive as an Actions artifact. A Dockerfile provides a container build as well. Deployment remains a project decision: the template does not assume a hosting account, database, or public HTTP service.

## Start a project from the template

[Elixir AI Starter](https://github.com/tgrk/elixir-ai-starter) brings these pieces into a small OTP application: pinned Elixir and Erlang versions, a committed lockfile, Fittr's quality dependencies, a supervisor, tests, portable `AGENTS.md` and `RULES.md` files, and the verification and release workflows described above. The Dialyzer ignore list starts empty; Fittr's application-specific exceptions do not belong in a new project.

With repository access, choose **Use this template**, create your repository, and clone it. Install the versions from `.tool-versions` using mise or asdf. Then give the application its own name before adding domain code:

```sh
mise install
mix setup
mix rename.project MyApp
mix format
mix verify
MIX_ENV=prod mix release.build
```

GitHub names the repository, but the Elixir module namespace and OTP application name also need to change. The starter's `mix rename.project MyApp` command wraps [rename_project](https://hex.pm/packages/rename_project) and includes shell scripts and YAML workflows alongside code, documentation, and the Dockerfile. It selects the development environment explicitly because the package is a development-only dependency.

Renaming changes files and paths in place, so start from a clean commit and review the diff afterwards. CI exercises the operation in a disposable copy: it renames the starter to `ExampleApp`, checks the expected paths, compiles and tests the renamed application, and builds and smoke-tests its release. That checks whether the starting point remains usable as the template evolves.

For a web application, follow the [Phoenix and LiveView adoption guide](https://github.com/tgrk/elixir-ai-starter/blob/main/docs/phoenix.md). It explains how to merge the tooling into a generated Phoenix project while retaining its asset, endpoint, and database setup. Rename early: the renaming package skips the `assets/` directory by default. For a library, remove the application callback and empty supervisor if they serve no purpose.

Runtime access and reusable agent skills can improve that workflow, but the repository should already be able to answer three questions: where does this change belong, how do we know it works, and how do we ship the same thing we checked?

That is the part of Fittr's setup I find most useful in the age of AI. Generating a patch is quick. Giving that patch a clear place in the application, useful feedback, and a reviewable path to release is the engineering work.
