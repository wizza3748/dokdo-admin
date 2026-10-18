import { SharedReview } from "@/components/online-workbooks/shared-review"
export const metadata = {robots:{index:false,follow:false},referrer:"no-referrer" as const}
export default async function Page({params}: {params:Promise<{token:string}>}) { const {token} = await params; return <SharedReview token={token}/> }
