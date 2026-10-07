// 세트의 무게와 횟수가 도메인 규칙에 맞는지 검사한다

const isValidWeight = (weight: number) => Number.isFinite(weight) && weight >= 0
const isValidReps = (reps: number) => Number.isInteger(reps) && reps >= 1

/** 무게는 0 이상 유한한 수, 횟수는 1 이상 정수인지(화면이 기록 버튼을 켤지 판단할 때 쓴다). */
export function isValidSetValues(weight: number, reps: number): boolean {
  return isValidWeight(weight) && isValidReps(reps)
}

/** isValidSetValues 규칙을 어기면 어긴 값을 담은 Error를 던진다. */
export function assertValidSetValues(weight: number, reps: number): void {
  if (!isValidWeight(weight)) {
    throw new Error(`무게는 0 이상이어야 합니다: ${weight}`)
  }
  if (!isValidReps(reps)) {
    throw new Error(`횟수는 1 이상 정수여야 합니다: ${reps}`)
  }
}
