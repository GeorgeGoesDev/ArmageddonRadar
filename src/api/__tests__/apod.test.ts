import { normalizeApod } from '../apod';

describe('normalizeApod', () => {
  it('maps an image day', () => {
    const a = normalizeApod({
      date: '2026-07-16', title: 'NGC 300', explanation: 'x', media_type: 'image',
      url: 'http://img/lo.jpg', hdurl: 'http://img/hi.jpg', copyright: 'Someone',
    });
    expect(a).toEqual({
      date: '2026-07-16', title: 'NGC 300', explanation: 'x', mediaType: 'image',
      imageUrl: 'http://img/lo.jpg', hdImageUrl: 'http://img/hi.jpg', siteUrl: 'http://img/lo.jpg', copyright: 'Someone',
    });
  });
  it('maps a video day (no imageUrl, siteUrl = url)', () => {
    const a = normalizeApod({ date: '2026-07-17', title: 'V', explanation: 'y', media_type: 'video', url: 'http://youtube/embed' });
    expect(a.mediaType).toBe('video');
    expect(a.imageUrl).toBe('');
    expect(a.siteUrl).toBe('http://youtube/embed');
    expect(a.copyright).toBe('');
  });
});
