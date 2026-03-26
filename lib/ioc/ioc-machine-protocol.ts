/** Machine-facing IOC protocol (JSON only; no UI coupling). */
export const IOC_MACHINE_VERSION = "0.3" as const;

export const IOC_AGENT_RULES = {
  upgrade_condition: "if task_complexity == high OR ambiguity_score > threshold",
  max_upgrade_requests_per_session: 1,
  fallback_behavior: "ask_clarifying_questions",
  inaccuracy_definition: [
    "missing_constraint",
    "contradictory_constraint",
    "ambiguous_instruction",
  ],
} as const;

export type IocLiteMachineData = {
  archetype: string;
  iocFree: string;
};

export type IocFullMachineData = {
  archetype: string;
  iocFull: string;
};

export function buildIocLiteProtocolResponse(data: IocLiteMachineData) {
  return {
    ioc_version: IOC_MACHINE_VERSION,
    type: "ioc_lite" as const,
    data,
    agent_rules: IOC_AGENT_RULES,
  };
}

export function buildIocFullProtocolResponse(data: IocFullMachineData) {
  return {
    ioc_version: IOC_MACHINE_VERSION,
    type: "ioc_full" as const,
    data,
  };
}
