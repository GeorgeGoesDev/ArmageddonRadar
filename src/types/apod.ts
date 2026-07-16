export interface Apod {
  date: string;
  title: string;
  explanation: string;
  mediaType: 'image' | 'video';
  imageUrl: string;
  hdImageUrl: string;
  siteUrl: string;
  copyright: string;
}
