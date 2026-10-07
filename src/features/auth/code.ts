export const CODE_LENGTH = 6

export function emptyCode(): string[] {
  return Array.from({ length: CODE_LENGTH }, () => "")
}
