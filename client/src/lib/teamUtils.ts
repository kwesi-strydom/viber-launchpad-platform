export function teamNameToSlug(teamName: string): string {
  return teamName.toLowerCase().replace(/^team\s+/i, '').replace(/\s+/g, '-');
}
