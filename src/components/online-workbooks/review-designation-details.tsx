import type { ProDesignationPreview } from "@/lib/pro-domain"
import { reviewDesignationCopy } from "@/lib/review-list-presentation"

export function ReviewDesignationDetails({ preview }: { preview: ProDesignationPreview }) {
  if (preview.issue) return <p role="alert">{preview.issue}</p>
  return <>
    <p>{reviewDesignationCopy.question}</p>
    {preview.quota && <dl className="mt-3 space-y-1">
      <div className="flex items-center gap-2"><dt>{reviewDesignationCopy.available}:</dt><dd className="font-semibold tabular-nums">{preview.quota.available}권</dd></div>
      <div className="flex items-center gap-2"><dt>{reviewDesignationCopy.after}:</dt><dd className="font-semibold tabular-nums">{preview.quota.after}권</dd></div>
    </dl>}
    <p className="mt-3">{reviewDesignationCopy.usage}</p>
  </>
}
