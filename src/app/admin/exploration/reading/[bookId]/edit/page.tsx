import { ReadingBookDetail } from "@/components/reading/reading-admin"

export default async function ReadingBookDetailPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params
  return <ReadingBookDetail bookId={Number(bookId)} />
}
