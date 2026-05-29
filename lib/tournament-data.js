const baseTeams = [
  { id: 'A1', name: 'Mexico', group: 'A', flagEmoji: '🇲🇽' },
  { id: 'A2', name: 'Canada', group: 'A', flagEmoji: '🇨🇦' },
  { id: 'A3', name: 'Costa Rica', group: 'A', flagEmoji: '🇨🇷' },
  { id: 'A4', name: 'Jamaica', group: 'A', flagEmoji: '🇯🇲' },
  { id: 'B1', name: 'United States', group: 'B', flagEmoji: '🇺🇸' },
  { id: 'B2', name: 'Panama', group: 'B', flagEmoji: '🇵🇦' },
  { id: 'B3', name: 'Honduras', group: 'B', flagEmoji: '🇭🇳' },
  { id: 'B4', name: 'Saudi Arabia', group: 'B', flagEmoji: '🇸🇦' },
  { id: 'C1', name: 'Brazil', group: 'C', flagEmoji: '🇧🇷' },
  { id: 'C2', name: 'Colombia', group: 'C', flagEmoji: '🇨🇴' },
  { id: 'C3', name: 'Ecuador', group: 'C', flagEmoji: '🇪🇨' },
  { id: 'C4', name: 'Peru', group: 'C', flagEmoji: '🇵🇪' },
  { id: 'D1', name: 'Argentina', group: 'D', flagEmoji: '🇦🇷' },
  { id: 'D2', name: 'Uruguay', group: 'D', flagEmoji: '🇺🇾' },
  { id: 'D3', name: 'Chile', group: 'D', flagEmoji: '🇨🇱' },
  { id: 'D4', name: 'Paraguay', group: 'D', flagEmoji: '🇵🇾' },
  { id: 'E1', name: 'England', group: 'E', flagEmoji: '🇬🇧' },
  { id: 'E2', name: 'Netherlands', group: 'E', flagEmoji: '🇳🇱' },
  { id: 'E3', name: 'Denmark', group: 'E', flagEmoji: '🇩🇰' },
  { id: 'E4', name: 'Norway', group: 'E', flagEmoji: '🇳🇴' },
  { id: 'F1', name: 'France', group: 'F', flagEmoji: '🇫🇷' },
  { id: 'F2', name: 'Belgium', group: 'F', flagEmoji: '🇧🇪' },
  { id: 'F3', name: 'Switzerland', group: 'F', flagEmoji: '🇨🇭' },
  { id: 'F4', name: 'Austria', group: 'F', flagEmoji: '🇦🇹' },
  { id: 'G1', name: 'Germany', group: 'G', flagEmoji: '🇩🇪' },
  { id: 'G2', name: 'Italy', group: 'G', flagEmoji: '🇮🇹' },
  { id: 'G3', name: 'Croatia', group: 'G', flagEmoji: '🇭🇷' },
  { id: 'G4', name: 'Serbia', group: 'G', flagEmoji: '🇷🇸' },
  { id: 'H1', name: 'Spain', group: 'H', flagEmoji: '🇪🇸' },
  { id: 'H2', name: 'Portugal', group: 'H', flagEmoji: '🇵🇹' },
  { id: 'H3', name: 'Poland', group: 'H', flagEmoji: '🇵🇱' },
  { id: 'H4', name: 'Sweden', group: 'H', flagEmoji: '🇸🇪' },
  { id: 'I1', name: 'Japan', group: 'I', flagEmoji: '🇯🇵' },
  { id: 'I2', name: 'South Korea', group: 'I', flagEmoji: '🇰🇷' },
  { id: 'I3', name: 'Australia', group: 'I', flagEmoji: '🇦🇺' },
  { id: 'I4', name: 'Iran', group: 'I', flagEmoji: '🇮🇷' },
  { id: 'J1', name: 'Morocco', group: 'J', flagEmoji: '🇲🇦' },
  { id: 'J2', name: 'Senegal', group: 'J', flagEmoji: '🇸🇳' },
  { id: 'J3', name: 'Egypt', group: 'J', flagEmoji: '🇪🇬' },
  { id: 'J4', name: 'Tunisia', group: 'J', flagEmoji: '🇹🇳' },
  { id: 'K1', name: 'Nigeria', group: 'K', flagEmoji: '🇳🇬' },
  { id: 'K2', name: 'Cameroon', group: 'K', flagEmoji: '🇨🇲' },
  { id: 'K3', name: 'Algeria', group: 'K', flagEmoji: '🇩🇿' },
  { id: 'K4', name: 'Ivory Coast', group: 'K', flagEmoji: '🇨🇮' },
  { id: 'L1', name: 'Turkey', group: 'L', flagEmoji: '🇹🇷' },
  { id: 'L2', name: 'Ukraine', group: 'L', flagEmoji: '🇺🇦' },
  { id: 'L3', name: 'Czechia', group: 'L', flagEmoji: '🇨🇿' },
  { id: 'L4', name: 'Greece', group: 'L', flagEmoji: '🇬🇷' }
];

export const teams = baseTeams.map((team) => ({
  ...team,
  groupName: `Group ${team.group}`
}));

export const teamsByGroup = {
  'A': ['A1', 'A2', 'A3', 'A4'],
  'B': ['B1', 'B2', 'B3', 'B4'],
  'C': ['C1', 'C2', 'C3', 'C4'],
  'D': ['D1', 'D2', 'D3', 'D4'],
  'E': ['E1', 'E2', 'E3', 'E4'],
  'F': ['F1', 'F2', 'F3', 'F4'],
  'G': ['G1', 'G2', 'G3', 'G4'],
  'H': ['H1', 'H2', 'H3', 'H4'],
  'I': ['I1', 'I2', 'I3', 'I4'],
  'J': ['J1', 'J2', 'J3', 'J4'],
  'K': ['K1', 'K2', 'K3', 'K4'],
  'L': ['L1', 'L2', 'L3', 'L4']
};

const groupOrder = Object.keys(teamsByGroup);
const matchups = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2]
];
const firstKickoffAt = new Date('2026-06-11T18:00:00Z');
const sixHoursMs = 6 * 60 * 60 * 1000;

export const matches = groupOrder.flatMap((group, groupIndex) =>
  matchups.map(([homeIndex, awayIndex], roundIndex) => ({
    id: `${group}-${roundIndex + 1}`,
    home_team: teamsByGroup[group][homeIndex],
    away_team: teamsByGroup[group][awayIndex],
    kickoff_at: new Date(firstKickoffAt.getTime() + ((groupIndex * matchups.length) + roundIndex) * sixHoursMs).toISOString(),
    group: group,
    group_name: `Group ${group}`,
    stage: 'group',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    match_goals: []
  }))
);
