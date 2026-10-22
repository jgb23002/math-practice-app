# Feature Implementation Evidence

## 1. Arithmetic Question Generation - Phase 4

During Phase 4, I instructed my AI coding assistant to implement a reusable arithmetic question-generation service supporting addition, subtraction, multiplication, and division across four difficulty levels.

I specified that the implementation must follow the mathematical constraints in `specification.md`, including nonnegative subtraction results, whole-number division answers, nonzero division divisors, and difficulty-specific operand limits.

The AI identified several numeric ranges that were not explicitly defined in the specification and requested clarification. I reviewed its suggested defaults before allowing implementation to proceed.

The agent then implemented the question-generation service, centralized difficulty rules, arithmetic validation, and supporting utilities.

**Evidence:** Figure 1 - Arithmetic Implementation.

## 2. Feature Refinement Through Testing

After the initial implementation, I requested stronger automated tests rather than immediately moving to the next development phase.

My prompt asked the agent to test each arithmetic operation across all four difficulty levels, verify mathematical constraints, and report reproducible examples of failures.

The AI reported expanding its tests to include 64,000 seeded arithmetic samples and 30,720 mixed-operation samples. It also reported 353 passing tests after the refinement.

This interaction demonstrates how I used AI not only to generate code but also to improve verification and identify potential edge cases.

**Evidence:** Figures 2–3 — Testing Refinement and Code Changes.

## 3. Similar-Question Generation - Phase 13

During Phase 13, I directed the AI assistant to implement a service that generates additional questions based on previously recorded mistakes.

The feature supports nearby-number questions, reversed operands for addition and multiplication, and related arithmetic fact families.

For example, a missed multiplication fact such as 8 × 7 can generate related practice such as 7 × 8 or 56 ÷ 8, provided the new questions satisfy the selected difficulty rules.

The implementation also links review questions to the original mistake pattern and attempts to avoid repeating the same facts too frequently.

The AI reported completing the Phase 13 implementation and expanding automated coverage, with 932 passing tests at that development stage.

**Evidence:** Figures 4–5 - Similar-Question Implementation and Code Changes.

## 4. Reflection

These development phases helped me understand how to guide AI agents using detailed technical requirements rather than broad feature requests.

Arithmetic question generation demonstrated the importance of defining mathematical constraints and handling ambiguous requirements. Refining the tests showed that AI-generated functionality should be evaluated against systematic edge cases.

Similar-question generation introduced additional complexity because generated questions needed to remain connected to the student's original mistakes while preserving arithmetic correctness and difficulty restrictions.

Together, these interactions helped me practice directing an AI agent through implementation, clarification, testing, and refinement.
