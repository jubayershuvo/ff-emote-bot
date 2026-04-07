import { Metadata } from "next";
import ContactPage from "./Contact";
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get free emotes",
  alternates: { canonical: "https://vidscrapper.dev/contact" },
};
export default function Contact() {
  return (
    <div>
      <ContactPage />
    </div>
  );
}