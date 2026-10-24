import { Article } from "@/components/site";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <Article title="About CoupleSync">
      <p>CoupleSync is a private place for two people who already care about each other to learn the small, specific things that make their connection theirs.</p>
      <p>It is not a dating app, a compatibility verdict, or a psychological assessment. Scores describe answers you chose to share. A lower score means there is more to discover.</p>
      <p>Sample stories and the Maya and Jordan demo are fictional.</p>
    </Article>
  );
}
