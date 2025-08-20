export function getGoogleDriveDirectUrl(url: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    let fileId = '';
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
      fileId = fileIdMatch[1];
    } else {
      const ucMatch = url.match(/[?&]id=([^&]+)/);
      if (ucMatch) fileId = ucMatch[1];
      else {
        const openMatch = url.match(/\bid=([^&]+)/);
        if (openMatch) fileId = openMatch[1];
      }
    }
    if (fileId) {
      return `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}`;
    }
  }
  return url;
}

export function getProfileImageUrl(user: { profileImagePath?: string }) {
  if (user?.profileImagePath && user.profileImagePath.trim() !== '') {
    return getGoogleDriveDirectUrl(user.profileImagePath);
  }
  return '/default-avatar.svg';
} 