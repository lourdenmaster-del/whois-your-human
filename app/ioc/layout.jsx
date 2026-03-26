import IocSpecSignal from "./IocSpecSignal";

export const metadata = {
  title: "LIGS / IOC",
  description: "Enter your birthdate. Generate. Copy. Paste this into your AI chat. Then continue normally.",
  openGraph: {
    title: "LIGS / IOC",
    description: "Enter your birthdate. Generate. Copy. Paste this into your AI chat. Then continue normally.",
    siteName: "IOC",
  },
  twitter: {
    title: "LIGS / IOC",
    description: "Enter your birthdate. Generate. Copy. Paste this into your AI chat. Then continue normally.",
  },
};

export default function IocLayout({ children }) {
  return (
    <>
      <script type="application/json" id="ioc-interface-spec">
        {`{
  "system": "ioc_configuration_interface",
  "type": "behavior_override_generator",
  "input": ["birthdate"],
  "output": "initial_operating_conditions_block",
  "effect": "modifies agent response behavior when pasted into an AI chat session",
  "application": "paste_into_ai_chat_to_apply",
  "flow": [
    "enter birthdate",
    "generate",
    "copy",
    "paste into AI chat",
    "continue conversation"
  ]
}`}
      </script>
      <IocSpecSignal />
      {children}
    </>
  );
}
