import { ContactForm } from "@/components/contact-form";
import { Article } from "@/components/site";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <Article title="Contact">
      <p>Send a note about the product. The message is stored for the platform owner. When CONTACT_EMAIL is set, a copy is emailed there. It is not a couple answer.</p>
      <ContactForm />
    </Article>
  );
}
