export interface AvatarOption {
  id: string;
  url: string;
  bg: string;
}

const dicebear = (style: string, seed: string): string =>
  `https://api.dicebear.com/7.x/${style}/png?seed=${encodeURIComponent(seed)}&backgroundType=solid&radius=50`;

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'fox', url: dicebear('fun-emoji', 'Fox'), bg: '#FFE5B4' },
  { id: 'panda', url: dicebear('fun-emoji', 'Panda'), bg: '#E0F2FE' },
  { id: 'bunny', url: dicebear('fun-emoji', 'Bunny'), bg: '#FCE7F3' },
  { id: 'tiger', url: dicebear('fun-emoji', 'Tiger'), bg: '#FEF3C7' },
  { id: 'koala', url: dicebear('big-smile', 'Koala'), bg: '#DCFCE7' },
  { id: 'lion', url: dicebear('big-smile', 'Lion'), bg: '#FFEDD5' },
  { id: 'whale', url: dicebear('big-smile', 'Whale'), bg: '#DBEAFE' },
  { id: 'frog', url: dicebear('big-smile', 'Frog'), bg: '#D1FAE5' },
  { id: 'robo1', url: dicebear('bottts', 'Sparky'), bg: '#EDE9FE' },
  { id: 'robo2', url: dicebear('bottts', 'Buzz'), bg: '#FEE2E2' },
  { id: 'kid1', url: dicebear('adventurer', 'Milo'), bg: '#FFF7ED' },
  { id: 'kid2', url: dicebear('adventurer', 'Luna'), bg: '#F5F3FF' },
  { id: 'kid3', url: dicebear('adventurer', 'Zoe'), bg: '#ECFEFF' },
  { id: 'kid4', url: dicebear('adventurer', 'Theo'), bg: '#FDF2F8' },
  { id: 'peep1', url: dicebear('open-peeps', 'Sunny'), bg: '#FEF9C3' },
  { id: 'peep2', url: dicebear('open-peeps', 'River'), bg: '#E0E7FF' },
  { id: 'pixel1', url: dicebear('pixel-art', 'Hero'), bg: '#FFE4E6' },
  { id: 'pixel2', url: dicebear('pixel-art', 'Star'), bg: '#CFFAFE' },
];

const CUSTOM_AVATAR_BG = '#E5E7EB';

export function isCustomAvatarUrl(value?: string): boolean {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

export function getAvatarById(id?: string): AvatarOption | undefined {
  if (!id) return undefined;
  const preset = AVATAR_OPTIONS.find((a) => a.id === id);
  if (preset) return preset;
  if (isCustomAvatarUrl(id)) {
    return { id, url: id, bg: CUSTOM_AVATAR_BG };
  }
  return undefined;
}
