---
title: "LLMs, compilers, and the question of trust"
cover: "/img/llm-trust/cover.png"
tags: ["LLM", "AI", "software", "technology"]
date: 2026-09-20T00:00:00+02:00
draft: false
featured: true
description: "Does trusting compilers, garbage collectors, and hardware mean we should trust LLMs in the same way? A look at abstraction, determinism, and the evidence behind delegation."
---

In discussions about AI-assisted development, I keep coming back to a comparison with earlier advances in software engineering. We trusted compilers to replace handwritten assembly, garbage collectors to manage memory, and increasingly complex hardware to execute our programs. Why should delegating work to an LLM be fundamentally different?

The appeal is clear: software development advances by moving responsibilities into tools. But adopting a tool, checking its output, and granting it authority are different decisions. To understand how far the analogy goes, we need to examine what each tool takes responsibility for, what its contract promises, and where uncertainty remains.

<!--more-->

We already trust systems whose work we do not inspect in full. If my standard for trusting software is that I personally wrote every line, that standard deserves questioning. Personal authorship does not establish correctness.

An LLM lets us describe a desired result at a higher level and delegate more of the implementation. The question is which details we can safely stop thinking about, and under what conditions. [This account on X](https://x.com/v0xium/status/2101526107128529120) illustrates why those conditions matter.

## What exactly are we delegating?

A compiler translates a program expressed in a formal language. Its correctness contract concerns preserving the behavior allowed by that language. It does not establish whether the program implements the right business requirement.

The [CompCert documentation](https://compcert.org/man/manual001.html) makes that contract explicit through semantic preservation. Its verified compilation passes preserve allowed source behavior within the proof's scope and assumptions. Most compilers do not come with equivalent proofs, and compiler bugs exist. There is nevertheless a precise relationship to check between input and output.

A garbage collector has another bounded responsibility: reclaim memory while preserving objects the program can still access. The [Go GC guide](https://go.dev/doc/gc-guide) explains the associated CPU, memory, and latency trade-offs. Choosing whether those costs fit an application remains an engineering decision.

A processor executes instructions according to its architecture and memory model. We can ignore much of its internal machinery, but must respect its exposed rules, particularly around concurrency. It does not decide our application's permissions or business rules.

An LLM coding assistant can take on a broader responsibility. Given an incomplete request, it may infer requirements, choose an architecture, fill in missing details, and implement the result. Some of that work resembles what we ask another developer to do.

Consider the request: "Make this endpoint faster."

A compiler can optimize within language rules. An assistant might add caching, introducing decisions about freshness, authorization, invalidation, and memory use. The code can compile and pass existing tests while introducing behavior nobody intended.

With a dependable compiler, we can reason about the source and rely on translation to preserve its meaning. With an assistant generating the source, we still need to establish that the proposed meaning is the one we wanted. A tightly specified transformation leaves less room for interpretation than a request to design an entire feature.

## What varies, and what must hold?

Describing the difference as deterministic tools versus nondeterministic LLMs is too broad. We need to distinguish variation from violations of a contract.

| System | What can vary? | What correctness depends on |
| --- | --- | --- |
| Compiler | Generated instructions across versions, targets, and optimization settings | Preserving the source program's defined behavior |
| Processor | Execution timing and interleaving with concurrent work | Respecting the architecture and memory model |
| Garbage collector | Collection timing, pauses, and memory consumption | Preserving reachable objects while reclaiming memory |
| LLM coding assistant | Interpretation, implementation strategy, and generated code | Satisfying the intended requirements and constraints |

Changing a compiler version or its settings changes the inputs; different output there is not itself evidence of nondeterminism. With fixed inputs and a controlled environment, compilation can be repeatable. Hardware and runtimes introduce other variability, especially in concurrent execution.

LLM generation can produce different answers to the same visible request. Sampling is one source of variation; context, model version, and tool results also matter. Reproducing a result requires controlling more than the prompt.

The distinction I care about is where variation appears. A correct GC may collect at different moments while preserving reachable objects. An assistant's different interpretations can change application behavior.

Ask it to "add retries" to an operation that submits a payment. One implementation might use an idempotency key and retry only appropriate failures. Another might blindly repeat the request after any timeout. If the first request succeeded but its response was lost, the second implementation could submit the payment again.

Both may compile. Their difference affects a business rule.

Repeatability asks whether the same inputs produce the same output. Correctness asks whether that output satisfies the requirements. A deterministic tool can produce the same wrong result every time; a nondeterministic process can produce several equally valid solutions. Making an LLM repeatable would help debugging without establishing correctness.

## What verification actually requires

Generating code and running it are separate activities. A saved and committed patch is a fixed artifact. The model's generation process does not automatically make the program's execution nondeterministic. Calling an LLM at runtime introduces additional variability. The surrounding harness—the software that manages context, tools, and execution—can also affect the outcome.

We can allow flexibility in producing a candidate, then evaluate it against explicit requirements. Stronger specifications and independent checks make broader delegation reasonable.

Tests help, but their value depends on what they test. If the assistant writes an implementation and tests based on the same mistaken assumption, green tests can reinforce the mistake. Review must still ask whether the expected behavior is right. The same problem exists when humans write the code and tests.

[Anthropic's December 2024 guidance on building agents](https://www.anthropic.com/engineering/building-effective-agents) discusses autonomy's costs, compounding errors, environmental feedback, testing, and human checkpoints. Its tooling discussion now carries an age warning; these principles remain relevant to evaluating a workflow.

## Trust should describe a particular workflow

"Trust AI more" leaves too much unspecified. Trust it to suggest alternatives? Edit a function? Open a pull request? Merge a database migration? Act on production data?

Those decisions have different consequences and verification costs. I can reasonably grant substantial freedom for one and require close review for another.

The history of a successful abstraction does not establish the reliability of a new one. Earlier adoption decisions involved real trade-offs; skepticism alone tells us little about whether an objection is justified.

For a team deciding how much to delegate, I would start with concrete questions:

- Which tasks does the assistant complete reliably in our codebase?
- How much time do specification, review, and rework take?
- Which mistakes do our checks catch, and which still reach users?
- Can we detect and recover from a bad change cheaply?

The comparison should include human work under the same conditions. Requiring perfection from AI while overlooking familiar human errors would distort the answer. Counting generated code while ignoring maintenance effort would do the same.

The question I would bring back to a discussion about trust is:

> Which responsibilities can we now delegate reliably, what evidence supports that, and what verification still needs to remain?

Trust can grow as the workflow earns it.
