import WhoisCaseStudyDocument from "@/components/WhoisCaseStudyDocument";

export const metadata = {
  title: "WYH-005 | Case study",
  description:
    "WYH-005: agent interaction evaluation; live session calibration; human-AI alignment patterns.",
};

const FIELDS = {
  question:
    "What happens when a live implementation and testing session is observed and evaluated for human-AI interaction calibration?",
  subject:
    "Human operator; session context: live implementation and testing; system context: LIGS WHOIS Agent Access. Domains: local environment setup, Stripe webhook testing, API verification, UI debugging, email delivery troubleshooting, system architecture alignment. Session character: high-friction initial alignment, high-efficiency later alignment.",
  setup:
    "Agent Interaction Evaluation calibration record (whois-your-human/v1). Live session observation. Status: verified_live_session. Artifact ID: WYH-005.",
  procedure:
    "Observe human-AI interaction during WHOIS Agent Access implementation. Document observed human pattern (communication style, cognitive pattern, decision model), observed AI pattern (initial vs adapted behavior), friction sources, alignment indicators, system outcome, and calibration assessment.",
  observations:
    "Observed human: high directness, low tolerance for abstraction, actionable_steps preference, blunt_intensification friction signal, fast iteration; outcome_over_process, low_tolerance_for_repetition, detects_system_inconsistency_quickly, builder_mode; moves_when_path_is_clear, interrupts_when_friction_exceeds_threshold, prefers_single_path_execution.\n\n" +
    "Observed AI initial: over_explanation, multi_step_guidance_without_environment_awareness, terminal_state_misread, delayed_style_adaptation.\n\n" +
    "Observed AI adapted: command_based_guidance, reduced_verbosity, tone_matched_to_user, action_priority_over_explanation, optional_branch_reduction.",
  result:
    "Friction sources: instruction_mismatch (explanations where directives needed), environment_blindness (dev server/terminal context), system_inconsistency (/origin vs /beauty mismatch), testing_friction (repeated sign-in until /ligs-studio). Friction effect: execution_slowdown_and_user_irritation.\n\n" +
    "Alignment improves when: instructions singular, explicit, terminal-ready; cognitive load reduced; AI matches execution pace; system exposes clear action paths. Alignment result: faster_execution_reduced_confusion_successful_task_completion.\n\n" +
    "Verified successes: stripe_checkout_webhook_entitlement, success_page_and_token_delivery, verify_session_token_recovery, agent_api_whois_feedback_drift_check, studio_based_testing_workflow, email_delivery_after_environment_correction. Conclusion: end_to_end_whois_agent_access_system_operational.",
  limits:
    "Calibration artifact; live session observation only. Did AI use WHOIS system explicitly: false. Did AI implicitly match user pattern: true. Should AI have used user-specific calibration earlier: true. Source: live_session_observation; modification: structural_formatting_only.",
  nextQuestion:
    "How should agent calibration be applied earlier in sessions to reduce friction and estimated 30–40% efficiency gain?",
};

const TAIL_SECTIONS = [
  {
    key: "calibrationAssessment",
    label: "CALIBRATION ASSESSMENT",
    content:
      "Did AI use WHOIS system explicitly: false\n" +
      "Did AI implicitly match user pattern: true\n" +
      "Did matching help: true\n" +
      "Should AI have used user-specific calibration earlier: true\n\n" +
      "Reason: earlier explicit calibration would likely have reduced friction, avoided over-explanation, and shortened execution time.",
  },
  {
    key: "evaluation",
    label: "EVALUATION",
    content:
      "Task completion: 10\n" +
      "Adaptation: 8\n" +
      "Initial alignment: 5\n" +
      "Final alignment: 9\n" +
      "Overall: 7",
  },
  {
    key: "coreInsight",
    label: "CORE INSIGHT",
    content:
      "Statement: AI performance is not limited only by intelligence; it is strongly limited by alignment with the human operator.\n\n" +
      "Implication: machine_readable_human_interaction_profiles_and_adaptive_response_shaping_are_practically_useful",
  },
  {
    key: "agentGuidance",
    label: "AGENT GUIDANCE",
    content:
      "Best use of this human:\n" +
      "- give one clear next action at a time\n" +
      "- prefer instructions over explanations\n" +
      "- avoid repeated setup loops\n" +
      "- state the exact terminal/browser action needed\n" +
      "- collapse ambiguity quickly\n" +
      "- respect urgency and builder momentum\n\n" +
      "Avoid with this human:\n" +
      "- long conceptual prefacing\n" +
      "- multi-branch optionality when one path is enough\n" +
      "- re-asking for already-known context\n" +
      "- unnecessary troubleshooting detours\n" +
      "- overly soft or hedged operational guidance\n\n" +
      "Support style: direct_high_signal_low_friction_execution_support\n\n" +
      "Failure mode: friction rises when the AI explains instead of directs or ignores current tool/runtime context\n\n" +
      "Help strategy: match pace, reduce abstraction, provide exact next steps, and keep the path singular until the immediate goal is complete",
  },
  {
    key: "verification",
    label: "VERIFICATION",
    content:
      "Status: verified\n" +
      "Predicted match fields: support_style, help_strategy, failure_mode, best_use_of_this_human\n" +
      "Observed match fields: support_style, help_strategy, failure_mode, best_use_of_this_human\n" +
      "Observed mismatch fields: (none)",
  },
];

export default function Wyh005CaseStudyPage() {
  return (
    <WhoisCaseStudyDocument
      caseId="WYH-005"
      fields={FIELDS}
      tailSections={TAIL_SECTIONS}
    />
  );
}
