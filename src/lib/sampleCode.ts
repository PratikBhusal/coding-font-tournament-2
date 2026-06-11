export const DEFAULT_LANGUAGE = "typescript";

export const sampleLanguages = [
  { id: "typescript", displayName: "TypeScript" },
  { id: "python", displayName: "Python" },
] as const;

export type SampleLanguage = (typeof sampleLanguages)[number]["id"];

export const sampleCodeByLanguage: Record<SampleLanguage, string> = {
  typescript: `// This is a single-line comment example

/*
 * 1234567890
 * oO08 iIlL1 g9qCGQ 8%& <([{}])> .,;: ~-_=
 *
 * THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG
 *
 * the quick brown fox jumps over the lazy dog
 */

function isMultipleOf(num: number, multiple: number): void {
  if (num === 0) {
    console.log('0 is a neutral element in multiplication.');
    return;
  }

  for (let i = 1; i <= 10; i++) {
    const value = num * i;
    console.log(value % multiple === 0 ? 'multiple' : 'not multiple');
  }
}

const oO0: number = 0;
const l1I: number = 1;
isMultipleOf(oO0, l1I);
export {};`,
  python: `import os
from typing import Any

"""
1234567890
oO08 iIlL1 g9qCGQ 8%& <([{}])> .,;: ~-_=

THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG

the quick brown fox jumps over the lazy dog
"""

def is_multiple_of(num: int, multiple: int) -> None:
    if num == 0:
        print("0 is a neutral element in multiplication.")
        return

    for index in range(1, 11):
        value = num * index
        print(f"{value} -> {value % multiple == 0}")
`,
};
