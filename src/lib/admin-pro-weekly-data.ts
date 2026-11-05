// Read-only examples using the existing student/institution catalog and ProMember fields.
// These examples never write to the shared review store or student-test workspaces.
// @ts-expect-error Node native TS tests use explicit extensions.
import { adminStudents, adminInstitutions } from "./admin-local-catalog.ts"
import type { ProMember } from "./pro-types"

export const adminWeeklyAvailableFrom = "2026-09-28T00:00:00+09:00"
const at = (date: string) => new Date(`${date}+09:00`).toISOString()
function member(index: number, institutionId: string, start: string, extra: Partial<ProMember> = {}): ProMember {
  const student = adminStudents[index]
  return {
    id: student.id, name: student.name, account: student.userId, age: student.age, level: 4,
    product: "pro", external: true, status: "active", institutionId, teacherId: "teacher-1",
    assignedAt: at(start), effectiveAt: adminWeeklyAvailableFrom, effectiveMonth: "2026-10",
    serviceEnd: "2027-12-31T14:59:59.999Z", parentContact: true, limits: {}, overrides: {}, ...extra,
  }
}

export function adminWeeklyMembers(): ProMember[] {
  return [
    // This week: five starts and five ends; only 김민한 appears in both lists.
    member(0, "1085", "2026-11-02T09:00:00"),
    member(1, "1085", "2026-10-05T09:00:00", { status: "ended", endedAt: at("2026-11-03T10:00:00"), serviceEnd: at("2026-11-03T10:00:00") }),
    member(2, "1085", "2026-10-05T09:00:00", { status: "ended", endedAt: at("2026-11-04T10:00:00"), serviceEnd: at("2026-11-04T10:00:00") }),
    member(3, "", "2026-11-03T11:00:00", { matchingHistory: [
      { at: at("2026-11-03T11:00:00"), institutionId: "1082" },
      { at: at("2026-11-04T11:00:00"), institutionId: "" },
    ] }),
    member(4, "", "2026-09-28T09:00:00", { matchingHistory: [
      { at: at("2026-09-28T09:00:00"), institutionId: "1070" },
      { at: at("2026-11-02T16:00:00"), institutionId: "" },
    ] }),
    // Continuous academy transfers are excluded from starts/ends. October's
    // confirmed count at 신통방통 is truly zero, distinguishable from missing data.
    member(5, "1082", "2026-09-28T09:00:00", { matchingHistory: [
      { at: at("2026-09-28T09:00:00"), institutionId: "1082" },
      { at: at("2026-09-30T10:00:00"), institutionId: "1085" },
      { at: at("2026-11-03T10:00:00"), institutionId: "1082" },
    ] }),
    member(6, "1085", "2026-11-02T10:00:00"),
    member(7, "1070", "2026-11-04T09:00:00"),
    member(8, "1066", "2026-10-12T09:00:00", { status: "ended", endedAt: at("2026-11-04T14:00:00"), serviceEnd: at("2026-11-04T14:00:00") }),
    member(9, "1066", "2026-11-03T14:00:00"),
  ]
}

export const adminWeeklyInstitutions = adminInstitutions.map(({ id, name }) => ({ id, name }))
