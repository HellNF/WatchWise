import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/movie?category=popular")
}
