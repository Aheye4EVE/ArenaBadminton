import type { Metadata } from "next";
import PreviewPage from "@/components/preview-page";

export const metadata: Metadata = { title: "บอร์ดพูดคุย | Arena-Badminton" };

export default function MessagesPage() {
  return <PreviewPage kind="messages" />;
}
