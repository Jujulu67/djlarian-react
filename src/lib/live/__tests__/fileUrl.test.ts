import { isLiveAudioBlobUrl, isLiveAudioUrl, isOwnLiveAudioUrl } from '../fileUrl';

const BLOB =
  'https://abc123.public.blob.vercel-storage.com/live-audio/live-audio-user1-1700000000000-abc.mp3';
const LOCAL = '/uploads/live-audio/live-audio-user1-1700000000000-abc.wav';

describe('fileUrl', () => {
  it('accepte une URL Blob valide', () => {
    expect(isOwnLiveAudioUrl(BLOB, 'user1')).toBe(true);
    expect(isLiveAudioUrl(BLOB)).toBe(true);
    expect(isLiveAudioBlobUrl(BLOB)).toBe(true);
  });

  it('accepte un chemin local valide', () => {
    expect(isOwnLiveAudioUrl(LOCAL, 'user1')).toBe(true);
    expect(isLiveAudioUrl(LOCAL)).toBe(true);
  });

  it("refuse le fichier d'un autre utilisateur pour isOwn mais l'accepte pour isLiveAudioUrl", () => {
    expect(isOwnLiveAudioUrl(BLOB, 'user2')).toBe(false);
    expect(isOwnLiveAudioUrl(LOCAL, 'user2')).toBe(false);
    expect(isLiveAudioUrl(BLOB)).toBe(true);
    expect(isLiveAudioUrl(LOCAL)).toBe(true);
  });

  it('ne confond pas un identifiant préfixe (user1 vs user10)', () => {
    expect(isOwnLiveAudioUrl(BLOB.replace('user1-', 'user10-'), 'user1')).toBe(false);
  });

  it('refuse un hôte étranger', () => {
    expect(isLiveAudioUrl('https://evil.example.com/live-audio/live-audio-user1-1-a.mp3')).toBe(
      false
    );
    expect(
      isLiveAudioUrl(
        'https://abc123.public.blob.vercel-storage.com.evil.com/live-audio/live-audio-user1-1-a.mp3'
      )
    ).toBe(false);
    expect(
      isOwnLiveAudioUrl(
        'https://blob.vercel-storage.com/live-audio/live-audio-user1-1-a.mp3',
        'user1'
      )
    ).toBe(false);
  });

  it('refuse http://', () => {
    expect(isLiveAudioUrl(BLOB.replace('https://', 'http://'))).toBe(false);
  });

  it('refuse une query string ou un hash', () => {
    expect(isLiveAudioUrl(`${BLOB}?x=1`)).toBe(false);
    expect(isLiveAudioUrl(`${BLOB}#frag`)).toBe(false);
    expect(isLiveAudioUrl(`${LOCAL}?x=1`)).toBe(false);
  });

  it('refuse `..` et slash dans le nom', () => {
    expect(isLiveAudioUrl('/uploads/live-audio/../live-audio-user1-1-a.mp3')).toBe(false);
    expect(isLiveAudioUrl('/uploads/live-audio/sub/live-audio-user1-1-a.mp3')).toBe(false);
    expect(isLiveAudioUrl('/uploads/live-audio/live-audio-user1-..%2F..%2Fx.mp3')).toBe(false);
    expect(
      isLiveAudioUrl(
        'https://abc123.public.blob.vercel-storage.com/live-audio/sub/live-audio-user1-1-a.mp3'
      )
    ).toBe(false);
  });

  it('refuse un fichier hors du dossier live-audio', () => {
    expect(
      isLiveAudioUrl(
        'https://abc123.public.blob.vercel-storage.com/avatars/live-audio-user1-1-a.mp3'
      )
    ).toBe(false);
    expect(isLiveAudioUrl('/uploads/avatars/live-audio-user1-1-a.mp3')).toBe(false);
    expect(isLiveAudioUrl('/uploads/live-audio/photo.png')).toBe(false);
  });

  it('refuse les valeurs non-string', () => {
    for (const v of [null, undefined, 42, {}, [], true]) {
      expect(isLiveAudioUrl(v)).toBe(false);
      expect(isOwnLiveAudioUrl(v, 'user1')).toBe(false);
      expect(isLiveAudioBlobUrl(v)).toBe(false);
    }
  });

  it('isLiveAudioBlobUrl refuse le chemin local', () => {
    expect(isLiveAudioBlobUrl(LOCAL)).toBe(false);
  });
});
