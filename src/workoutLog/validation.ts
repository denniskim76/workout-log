// 세트 무게와 횟수의 입력 규칙을 검사하는 WorkoutLog 내부 검증

/** 무게는 0 이상 유한수, 횟수는 1 이상 정수가 아니면 Error를 던진다. */
export function assertValidSetValues(weight: number, reps: number): void {
  if (!Number.isFinite(weight) || weight < 0) {
    throw new Error(`무게는 0 이상이어야 합니다: ${weight}`)
  }
  if (!Number.isInteger(reps) || reps < 1) {
    throw new Error(`횟수는 1 이상 정수여야 합니다: ${reps}`)
  }
}
