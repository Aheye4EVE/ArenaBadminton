import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "บอร์ดพูดคุย | Arena-Badminton" };

export default function MessagesPage() {
  redirect("/community");
}
