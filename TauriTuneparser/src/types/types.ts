export type MediaRecord = {
  id: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  plays: number;
  dateAdded: string;
  year?: string;
  trackNo?: number;
  grouping?: string;
  hasVideo?: boolean;
};