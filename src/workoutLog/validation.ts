// 세트의 무게와 횟수가 도메인 규칙에 맞는지 검사한다

/** 무게는 0 이상 유한한 수, 횟수는 1 이상 정수여야 한다. 아니면 Error를 던진다. */
export function assertValidSetValues(weight: number, reps: number): void {
  if (!Number.isFinite(weight) || weight < 0) {
    throw new Error(`무게는 0 이상이어야 합니다: ${weight}`)
  }
  if (!Number.isInteger(reps) || reps < 1) {
    throw new Error(`횟수는 1 이상 정수여야 합니다: ${reps}`)
  }
}
