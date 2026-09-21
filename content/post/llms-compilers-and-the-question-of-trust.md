---
title: "LLMs, compilers, and the question of trust"
cover: "/img/llm-trust/cover.png"
tags: ["LLM", "AI", "software", "technology"]
date: 2026-09-20T00:00:00+02:00
draft: true
featured: true
description: "Does trusting compilers, garbage collectors, and hardware mean we should trust LLMs in the same way? A look at abstraction, determinism, and the evidence behind delegation."
---

In discussions about AI-assisted development, I keep coming back to a comparison with earlier advances in software engineering. We trusted compilers to replace handwritten assembly, garbage collectors to manage memory, and increasingly complex hardware to execute our programs. Why should delegating work to an LLM be fundamentally different?

For managers looking for the next productivity gain, this is an appealing argument. Software development has advanced by moving responsibilities into tools. Developers who insist on retaining every detail of manual control can miss the value of a better abstraction.

But the comparison bundles together several different questions: whether to use a tool, whether to check its output, and how much authority to give it. A useful technology can deserve widespread adoption while still requiring a different kind of verification from the tools that came before it.

I think the analogy is worth taking seriously. To understand how far it goes, we need to look at what each tool takes responsibility for, what its contract promises, and where uncertainty remains.

<!--more-->

## Why the comparison is appealing

The strongest version of the argument is straightforward: we already trust systems whose work we do not inspect in full. We write source code without reviewing every generated instruction. We use garbage collectors without deciding when each allocation should be released. We rely on processors without understanding every detail of their implementation.

If my standard for trusting software is that I personally wrote every line, that standard deserves questioning. Personal authorship does not establish correctness. Familiar code can contain familiar mistakes.

An LLM can look like the next step in this progression: describe the desired result at a higher level and let the tool handle more of the implementation. The potential benefit is real enough to investigate. Requiring developers to inspect everything forever would rule out much of what makes abstraction useful.

The difficulty is that moving to a higher level does not automatically give us a dependable abstraction. We also need to know which details we can safely stop thinking about and under what conditions.

There may be a difference in what managers and developers are observing. A demonstration makes the speed of producing an implementation visible. Understanding it, correcting it, and maintaining it take longer to observe. Conversely, a developer focused on individual mistakes may overlook a workflow that produces better results overall. Neither perspective alone settles the question.

## What exactly are we delegating?

A compiler translates a program expressed in a formal language. Its correctness contract concerns preserving the behavior allowed by that language. It does not establish whether the program implements the right business requirement.

The [CompCert documentation](https://compcert.org/man/manual001.html) makes that contract explicit through semantic preservation. Its verified compilation passes preserve allowed source behavior within the proof's scope and assumptions. Most compilers do not come with equivalent proofs, and compiler bugs exist. The useful point is that there is a precise relationship to check between input and output.

A garbage collector has another bounded responsibility: reclaim memory while preserving objects the program can still access. It also introduces costs. The [Go GC guide](https://go.dev/doc/gc-guide) explains trade-offs involving CPU, memory, and latency. Choosing whether those costs fit an application is an engineering decision. Concerns about them do not become irrelevant because automatic memory management is useful.

Hardware adds another layer. When we rely on a processor, we expect it to execute instructions according to its architecture and memory model. We do not need to follow every internal operation to write a program, but we do need to respect the exposed rules, particularly around concurrency. The processor does not decide what our application's permissions or business rules ought to be.

An LLM coding assistant can take on a much broader responsibility. Given an incomplete request, it may infer requirements, choose an architecture, invent missing details, and implement the result. Some of that work resembles what we ask another developer to do.

Consider the request: "Make this endpoint faster."

A compiler can optimize the implementation within language rules. An assistant might add caching. That introduces decisions about freshness, authorization, invalidation, and memory use. The code can compile and pass existing tests while introducing a behavior nobody intended.

The assistant may make excellent decisions. The question is how we establish that they are appropriate for this application.

That changes where verification belongs. With a dependable compiler, we can usually reason about the source program and rely on the translation to preserve its meaning. With an assistant generating the source, we still need to establish that the proposed meaning is the one we wanted. A natural-language request often leaves more room for interpretation than a program written in a formal language.

This is also task-dependent. An assistant applying a tightly specified transformation has less freedom than one asked to design an entire feature. Calling both activities "AI coding" hides a substantial difference in what we are delegating.

## Determinism needs a more careful comparison

It is tempting to describe the difference as deterministic tools versus nondeterministic LLMs. That is too broad. We need to say what can vary and what must remain reliable despite that variation.

| System | What can vary? | What correctness depends on |
| --- | --- | --- |
| Compiler | Generated instructions across versions, targets, and optimization settings | Preserving the source program's defined behavior |
| Processor | Execution timing and interleaving with concurrent work | Respecting the architecture and memory model |
| Garbage collector | Collection timing, pauses, and memory consumption | Preserving reachable objects while reclaiming memory |
| LLM coding assistant | Interpretation, implementation strategy, and generated code | Satisfying the intended requirements and constraints |

Changing a compiler version or its settings changes the inputs to the build; different output there is not itself evidence of nondeterminism. With fixed inputs and a controlled environment, compilation can be repeatable. Hardware and runtimes introduce other forms of variability, especially in concurrent execution.

LLM generation can produce different answers to the same visible request. Sampling is one source of variation; the surrounding context, model version, and tool results also matter. A repeatable workflow requires controlling more than the wording of the prompt.

The distinction I care about is where variation can appear. A correct GC may collect at different moments while preserving reachable objects. An assistant's different interpretations can change the application's intended behavior.

For example, ask it to "add retries" to an operation that submits a payment. One implementation might use an idempotency key and retry only appropriate failures. Another might blindly repeat the request after any timeout. If the first request succeeded but its response was lost, the second implementation could submit the payment again.

Both implementations may compile. Their difference is a business rule, not just an implementation detail.

That does not mean runtime variation is harmless. Pauses can violate latency requirements, and thread scheduling can expose races. Every abstraction has boundaries. The point is to identify those boundaries before treating different tools as equivalent.

## Repeatability and correctness are separate properties

Repeatability asks whether the same inputs produce the same output. Correctness asks whether that output satisfies the requirements.

A deterministic tool can produce the same wrong result every time. A nondeterministic process can produce several different, equally valid solutions. Making an LLM repeatable would help reproduce failures and compare changes. It would not, by itself, make its interpretation of a requirement correct.

There is also a distinction between generating code and running it. Once a generated patch is saved, reviewed, and committed, it is a fixed artifact. The model's generation process does not automatically make that program's execution nondeterministic. An application that calls an LLM at runtime has an additional source of variability to manage.

This gives us a practical way to use AI: allow flexibility in producing a candidate, then evaluate the candidate against requirements we can actually check. Stronger specifications and independent checks can make broader delegation reasonable.

Tests help, but their value depends on what they test. If the assistant writes both an implementation and tests based on the same mistaken assumption, green tests can reinforce the mistake. Review still needs to ask whether the expected behavior is right. The same problem exists when humans write the code and tests.

## When the analogy becomes a judgment about developers

One remark I overheard captured the historical comparison neatly:

> Feels a bit like 90s devs not wanting to let go of manual memory management.

It raises a fair question about attachment to control. But it also offers that attachment as an explanation for skepticism before examining the objection. A developer who refuses to try a tool and a developer who uses it extensively but still finds consequential mistakes need different conversations.

The history of a successful abstraction cannot establish the reliability of a new one. We still have to examine the responsibility being delegated, its failure modes, and the cost of checking the result. Earlier adoption decisions also involved real trade-offs; they were not simply contests between progress and stubbornness.

The useful challenge is whether our verification habits still match the evidence. That question leaves room both for increasing autonomy and for retaining checks that continue to catch important errors.

## Trust should describe a particular workflow

"Trust AI more" leaves too much unspecified. Trust it to suggest alternatives? Edit a function? Open a pull request? Merge a database migration? Act on production data?

Those decisions have different consequences and different verification costs. I can reasonably grant substantial freedom for one and require close review for another.

Even [Anthropic's guidance on building agents](https://www.anthropic.com/engineering/building-effective-agents) discusses the costs of autonomy, the possibility of compounding errors, and the value of environmental feedback, testing, and human checkpoints. Useful autonomy depends on the surrounding workflow.

For a team deciding how much to delegate, I would start with concrete questions:

- Which tasks does the assistant complete reliably in our codebase?
- How much time do specification, review, and rework take?
- Which mistakes do our checks catch, and which still reach users?
- Can we detect and recover from a bad change cheaply?

The comparison should include human work under the same conditions. Requiring perfection from AI while overlooking familiar human errors would give us a distorted answer. Counting generated code while ignoring the effort to maintain it would give us another.

The question I would bring back to a discussion about trust is:

> Which responsibilities can we now delegate reliably, what evidence supports that, and what verification still needs to remain?

Compilers, garbage collectors, and hardware show how much work we can delegate when the boundaries are dependable. LLMs may let us delegate substantially more, including work that requires interpretation and judgment. The scope of that opportunity makes understanding the contract and gathering evidence more valuable. Trust can grow as the workflow earns it.
