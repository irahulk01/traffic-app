// Group only within the same configured direction. Keep section geometry separate.
export function groupTrafficSections(sections) {
  const groups = new Map();
  for (const section of sections) {
    const key = section.routeId || section.id;
    if (!groups.has(key)) groups.set(key, { id: `road:${key}`, routeId: key, name: section.routeName || section.name, sections: [], affectedLengthMeters: 0, level: 'moderate', isStale: false, lastUpdated: section.lastUpdated });
    const group = groups.get(key);
    group.sections.push(section);
    group.affectedLengthMeters += Math.max(0, Number(section.affectedLengthMeters) || 0);
    if (section.level === 'heavy') group.level = 'heavy';
    group.isStale ||= Boolean(section.isStale);
    if (Date.parse(section.lastUpdated) < Date.parse(group.lastUpdated)) group.lastUpdated = section.lastUpdated;
  }
  return [...groups.values()].map(group => ({ ...group, sections: group.sections.sort((a,b) => a.level === b.level ? b.affectedLengthMeters - a.affectedLengthMeters : a.level === 'heavy' ? -1 : 1), sectionCount: group.sections.length, heavyCount: group.sections.filter(s => s.level === 'heavy').length, slowCount: group.sections.filter(s => s.level === 'moderate').length })).sort((a,b) => a.level === b.level ? b.affectedLengthMeters - a.affectedLengthMeters : a.level === 'heavy' ? -1 : 1);
}
