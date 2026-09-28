/** Kebijakan password operator: min. 12 karakter, huruf besar, huruf kecil, dan angka. */
export function passwordProblems(pw: string): string[] {
  const problems: string[] = [];
  if (pw.length < 12) problems.push("minimal 12 karakter");
  if (!/[a-z]/.test(pw)) problems.push("huruf kecil");
  if (!/[A-Z]/.test(pw)) problems.push("huruf besar");
  if (!/\d/.test(pw)) problems.push("angka");
  return problems;
}
