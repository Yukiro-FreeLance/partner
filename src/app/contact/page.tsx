import { ContactForm } from "@/components/contact-form";
import { Article } from "@/components/site";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <Article title="Contact">
      <p>Send a note about the product. If email delivery is not configured, the message is stored for the platform owner and is not a couple answer.</p>
      <ContactForm />
    </Article>
  );
}
