"use client"
import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { monthlyContextHref, monthlyTestCase, type MonthlyValidationCase } from "@/lib/monthly-test-context"
import { notifyReviewChange } from "@/lib/review-client"

type MonthlyTestContext = { scenario: MonthlyValidationCase | null; href: (href: string) => string; apply: (href: string, reset: boolean) => void }
const Context = React.createContext<MonthlyTestContext>({ scenario: null, href: href => href, apply: () => {} })
export function useMonthlyTest() { return React.useContext(Context) }
export function requestMonthlyNavigation(go: () => void) {
  const event = new CustomEvent("dokdo:before-navigation", { cancelable: true, detail: go })
  if (window.dispatchEvent(event)) go()
}
export function MonthlyTestProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(), params = useSearchParams(), router = useRouter()
  const [revision, setRevision] = React.useState(0)
  const scenario = monthlyTestCase(params.get("monthlyTest"))
  const currentHref = `${pathname}?${params}`
  const href = React.useCallback((target: string) => monthlyContextHref(target, currentHref), [currentHref])
  const apply = (target: string, reset: boolean) => {
    notifyReviewChange()
    if (reset) setRevision(value => value + 1)
    router.push(target, { scroll: false })
  }
  return <Context.Provider value={{ scenario, href, apply }}><React.Fragment key={`${scenario ?? "public"}:${params.get("monthlyLive") ?? ""}:${params.get("demoAgency") ?? ""}:${revision}`}>{children}</React.Fragment></Context.Provider>
}
