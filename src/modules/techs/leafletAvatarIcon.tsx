import L from 'leaflet';

export type AvatarUser = { name: string; avatarUrl?: string | null };

export function avatarDivIcon(user: AvatarUser, size = 44) {
  const initials = (user.name || '')
    .split(' ')
    .filter(Boolean)
    .map(s => s[0]!)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const imgHtml = user.avatarUrl
    ? `<img src="${user.avatarUrl}"
             alt=""
             crossorigin="anonymous"
             style="width:100%;height:100%;object-fit:cover;display:block"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
    : '';

  const html = `
    <div class="avatar-pin" style="
      width:${size}px;height:${size}px;border-radius:9999px;overflow:hidden;
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.28);background:#e2e8f0;
      display:flex;align-items:center;justify-content:center;">
      ${imgHtml}
      <span class="avatar-pin__initials" style="
        display:${user.avatarUrl ? 'none' : 'flex'};
        align-items:center;justify-content:center;
        width:100%;height:100%;font-weight:700;color:#334155;">
        ${initials || '•'}
      </span>
    </div>`;

  return L.divIcon({
    className: 'avatar-pin-wrap',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],   // centraliza o pin no ponto
    popupAnchor: [0, -size / 2],
  });
}
