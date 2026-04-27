export interface NoticeItem {
  id: number;
  title: string;
  createUser: string;
  createDate: string;
  updateUser: string;
  updateDate: string;
  imageUrl: string | null;
  content: string;
  pinned: boolean;
}

export const DEFAULT_VISIBLE_NOTICES = 5;

export interface NoticeImagePreset {
  alt: string;
  gradient: string;
}

export const NOTICE_IMAGE_PRESETS: NoticeImagePreset[] = [
  {
    alt: 'Community meeting visual',
    gradient:
      'linear-gradient(135deg, rgba(26,54,93,0.95) 0%, rgba(60,114,178,0.82) 55%, rgba(178,214,242,0.75) 100%)',
  },
  {
    alt: 'Parking zone visual',
    gradient:
      'linear-gradient(135deg, rgba(26,49,66,0.96) 0%, rgba(74,104,129,0.86) 55%, rgba(191,211,230,0.75) 100%)',
  },
  {
    alt: 'Maintenance and tools visual',
    gradient:
      'linear-gradient(135deg, rgba(59,62,82,0.95) 0%, rgba(109,130,171,0.84) 54%, rgba(236,223,170,0.76) 100%)',
  },
];
