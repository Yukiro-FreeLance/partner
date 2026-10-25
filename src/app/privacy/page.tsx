import { Article } from "@/components/site";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <Article title="Privacy">
      <p>Your answers, predictions, memories, and personality reflections are private relationship data. They are visible only inside your couple space, and only when the quiz or sharing rules allow it.</p>
      <p>We do not sell answers. Notifications and emails, when enabled, do not include answer text. Photos stay in private storage. You can export or delete your account from settings.</p>
      <p>Sensitive questions are optional. Personality results stay private until you explicitly share them. Administrators can manage the question library and see aggregate counts, not your private answers.</p>
      <p>Menstrual, fertility, intimacy, and pregnancy notes are private health records. They are not included in invitation codes, QR codes, or a partner view unless you turn on a specific share and can turn it off again. You can export or permanently delete those records from the cycle privacy page. Cycle reminders use discreet wording.</p>
      <p>This policy describes the product. It is not legal advice.</p>
    </Article>
  );
}
