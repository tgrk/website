---
title: "An Elixir project setup for the age of AI"
cover: "/img/elixir-tooling/cover.png"
tags: ["Elixir", "BEAM", "software", "AI", "agents"]
date: 2026-09-11T00:00:00+02:00
draft: false
featured: true
description: "The Mix defaults, quality checks, CI workflows, and agent instructions behind Fittr—and the Elixir AI Starter template extracted from them."
---

AI makes it easy to add code. I want my project setup to make it easy to question that code: does it fit the application, does it preserve behavior, and did we already have something that solves the problem?

Fittr, my personal fitness application (more on that in a future post), has become a place to work out that setup. It is a Phoenix LiveView project built with AI assistance, with ordinary Elixir tooling doing much of the checking. The interesting part is how those tools fit together: Mix gives the work a repeatable entry point, static analysis catches recurring mistakes, tests check behavior, and repository instructions give the agent local context.

I have extracted that workflow into [Elixir AI Starter](https://github.com/tgrk/elixir-ai-starter), a plain Elixir/OTP GitHub template with the quality tools, agent instructions, and CI configuration already connected. It provides a concrete starting point for the ideas in this post, with a separate guide for adopting the setup in Phoenix.

<!--more-->

## Put the workflow in Mix

I want the same commands available to me, a contributor, and a coding agent. Fittr's main quality entry point is an alias in `mix.exs`:

```elixir
quality: ["format", "ex_dna", "credo --strict", "dialyzer"]
```

That is a useful contract. The agent does not have to reconstruct the quality process from previous conversations. Running `mix quality` formats the code, checks duplication, runs strict linting, and performs Dialyzer analysis.

The alias does **not** run tests or Sobelow. Fittr's `RULES.md` requires both `mix test` and `mix quality` before claiming an implementation is complete, and `AGENTS.md` calls for `mix sobelow` before release or deployment. Those are separate steps today.

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

These are the repository's version constraints, not the versions installed. In the inspected September 2026 lockfile, Styler resolves to `1.12.2`, ForgeCredoChecks to `0.8.0`, and Tidewave to `0.9.0`. For example, `~> 1.4` permits versions from `1.4.0` up to, but excluding, `2.0.0`; `mix.lock` records the selected version. See Elixir's [version requirement rules](https://hexdocs.pm/elixir/Version.html#module-requirements).

Start a new project with formatting, tests, Credo, and Dialyzer, then add checks for mistakes that recur.

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

Alongside standard Credo checks, Fittr uses CredoResults for consistent return shapes and CredoUnnecessaryReduce for reductions that a standard library operation could replace. Its selected Forge checks cover collection operations, `with` conventions, and unnecessary control flow, including boolean `case` expressions and catch-all clauses that only raise. The result-tag configuration also allows Mnesia's `:atomic` alongside `:ok` and `:error`.

That last detail is what makes a lint configuration useful: it should understand the conventions the project actually needs. Enabling every available rule is not the objective.

### ExSlop catches some of the noise AI tends to add

[ExSlop](https://hexdocs.pm/ex_slop/readme.html) adds Credo checks for blanket rescues, redundant result wrapping, and comments that narrate obvious operations. Its scope also includes Ecto patterns such as queries inside `Enum.map` and loading records before filtering them in Elixir, plus GenServers used only as key-value stores. Those findings can reveal hidden failures or unnecessary work as well as verbose code.

Fittr registers the plugin and appends `Enum.map(ExSlop.recommended_checks(), &{&1, []})` to its enabled checks. That second step matters: an explicit `checks.enabled` list takes precedence over checks registered by the plugin. Installing the dependency alone does not establish that the intended rules are running.

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

The test environment needs the same care. Fittr uses a temporary Mnesia directory, but its fixed name lets simultaneous test runs from multiple worktrees interfere. Give independent runs separate storage directories; an agent running a second checkout should not disturb the first.

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

The repository instructions prefer Tidewave MCP for exploratory evaluation while keeping tests and other Mix tasks in the workflow. An agent can investigate a running context and check its assumptions against actual behavior. Connect your MCP client separately and keep evaluations limited to development data, especially around persistence and external integrations.

The starter makes this available without Phoenix: `mix tidewave` runs a development-only Bandit server on `127.0.0.1:4000`, with MCP at `/tidewave/mcp`. If that port is occupied, `TIDEWAVE_PORT=4001 mix tidewave` selects another. CI checks the MCP handshake, and the development dependencies stay out of the production release.

## Treat agent instructions as maintained documentation

Fittr has an `AGENTS.md` describing the project map, commands, domain responsibilities, caution areas, and collaboration rules. `RULES.md` records verification and LiveView conventions. Feature documents under `docs/` explain expected behavior in more detail.

There is also drift. `AGENTS.md` still describes Cachex persistence, while the implementation uses Mnesia. It mentions Mox although the inspected dependency list does not include it. A convincing instruction file can therefore send an agent toward an architecture or tool that is no longer present.

For a new project, I would keep the root instructions short: where code belongs, how to run it, how to verify it, and which operations can damage data. Put detailed feature decisions beside the project documentation and update the instructions when those decisions change.

Fittr also names reusable skills: instruction files that a coding agent can load for debugging, testing, or Elixir style. They help when installed, but a path into my home directory is useless to someone cloning the project. Keep the essential commands and constraints in the repository, with personal skills as optional additions.

## CI should enforce the same agreement

Fittr has separate Elixir and Dialyzer workflows. The Elixir workflow runs in `MIX_ENV=test`, installs dependencies, compiles with warnings treated as errors, checks formatting, and runs tests. The Dialyzer workflow maintains a PLT cache and runs `mix dialyzer --format github`.

Fittr's local quality command checks more than those workflows enforce. The starter closes that gap with a non-mutating `quality.check` alias and a `verify` alias that includes tests:

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

The difference is visible in the checks each workflow actually runs:

| Check | Fittr locally | Fittr CI | Starter CI (`mix verify`) |
| --- | --- | --- | --- |
| Formatting | `mix quality` rewrites files | Checks formatting | Checks formatting |
| ExUnit | Separate `mix test` gate | Runs tests | Runs tests |
| Credo and its extensions | `mix quality` | Not run | Runs checks |
| ExDNA | `mix quality` | Not run | Runs checks |
| Dialyzer | `mix quality` | Separate workflow | Runs analysis |
| Sobelow | Documented pre-release command | Not run | Fails on findings |

Fittr also configures weekly Dependabot updates for Mix dependencies and GitHub Actions, with grouped updates and an auto-merge workflow for eligible minor and patch changes. Whether merging is actually gated depends on repository settings and required checks, which these files alone do not establish. Automated updates deserve the same verification as an agent's patch.

The starter keeps the weekly updates and makes Dependabot auto-merge opt-in. Its [delivery guide](https://github.com/tgrk/elixir-ai-starter/blob/main/docs/delivery.md) explains the required repository settings; creating a repository from a template does not configure those settings for you.

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

GitHub names the repository; `mix rename.project MyApp` updates the Elixir namespace and OTP application name too. It wraps [rename_project](https://hex.pm/packages/rename_project), covering code, paths, documentation, Docker, and workflows. The package runs only in development.

Start from a clean commit and review the rename diff. CI checks that a renamed copy still compiles, passes tests, and starts as a release.

For a web application, follow the [Phoenix and LiveView adoption guide](https://github.com/tgrk/elixir-ai-starter/blob/main/docs/phoenix.md). It explains how to merge the tooling into a generated Phoenix project while retaining its asset, endpoint, and database setup. Rename early: the renaming package skips the `assets/` directory by default. For a library, remove the application callback and empty supervisor if they serve no purpose.

### Before you ship

`MIX_ENV=prod` in the command above is explicit: the `release.build` alias does not select production mode for you. The starter's release workflow runs verification, builds and smoke-tests a Linux release, and uploads an Actions artifact. Its Dockerfile supplies a container build; deployment still needs your chosen host and configuration.

For Phoenix, include asset building in that release path. Fittr's Dockerfile relies on static assets supplied in the build context; a fresh project's delivery path should build those assets reproducibly. The plain OTP starter has no frontend assets to build.

Runtime access and reusable agent skills can improve that workflow, but the repository should already be able to answer three questions: where does this change belong, how do we know it works, and how do we ship the same thing we checked?

That is the part of Fittr's setup I find most useful in the age of AI. Generating a patch is quick. Giving that patch a clear place in the application, useful feedback, and a reviewable path to release is the engineering work.
