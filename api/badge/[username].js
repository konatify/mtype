export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const username = url.pathname.split('/').filter(Boolean).pop()?.trim().replace(/[^a-zA-Z0-9_-]/g, '');

  if (!username) {
    return new Response(errorSvg('invalid username'), {
      headers: svgHeaders(0),
    });
  }

  let wpm = null;
  let acc = null;

  try {
    const res = await fetch(`https://api.monkeytype.com/users/${username}/profile`, {
      headers: { 'Accept': 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    if (res.ok) {
      const data = await res.json();
      const pb = data?.data?.personalBests;
      const entry =
        pb?.time?.['60']?.[0] ??
        pb?.time?.['15']?.[0] ??
        Object.values(pb?.time ?? {})?.[0]?.[0] ??
        null;

      if (entry) {
        wpm = Math.round(entry.wpm);
        acc = Math.round(entry.acc);
      }
    }
  } catch (_) {
  }

  const svg = buildSvg(username, wpm);

  return new Response(svg, {
    headers: svgHeaders(300),
  });
}

function svgHeaders(maxAge) {
  return {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
    'Access-Control-Allow-Origin': '*',
  };
}

function buildSvg(username, wpm) {
  const FONT = 'Roboto Mono, Courier New, monospace';

  const CPW = 7.2;
  const usernameW = username.length * CPW;
  const wpmText = wpm !== null ? `${wpm} wpm` : '';
  const wpmW = wpmText ? wpmText.length * CPW : 0;

  const LOGO_PAD_L = 10;
  const LOGO_PAD_R = 9;
  const logoText = 'mtype';
  const logoW = logoText.length * CPW + LOGO_PAD_L + LOGO_PAD_R;

  const DIVIDER = 1;

  const USER_PAD_L = 9;
  const USER_PAD_R = wpmText ? 5 : 10;
  const userSectionW = USER_PAD_L + usernameW + USER_PAD_R;

  const WPM_PAD_L = 4;
  const WPM_PAD_R = 10;
  const wpmSectionW = wpmText ? WPM_PAD_L + wpmW + WPM_PAD_R : 0;

  const totalW = Math.round(logoW + DIVIDER + userSectionW + wpmSectionW);
  const H = 28;
  const R = 6;

  const logoX = LOGO_PAD_L;
  const userX = logoW + DIVIDER + USER_PAD_L;
  const wpmX = logoW + DIVIDER + userSectionW + WPM_PAD_L;
  const wpmDivX = logoW + DIVIDER + userSectionW;
  const midY = H / 2 + 4.5;

  const wpmSection = wpmText ? `
    <rect x="${wpmDivX}" y="6" width="1" height="${H - 12}" fill="rgba(255,255,255,0.1)" rx="0.5"/>
    <text
      x="${wpmX + wpmSectionW / 2 - WPM_PAD_L / 2}"
      y="${midY}"
      font-family="${FONT}"
      font-size="11"
      font-weight="400"
      fill="rgba(255,255,255,0.45)"
      text-anchor="middle"
      dominant-baseline="auto"
    >${wpmText}</text>
  ` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${H}" role="img" aria-label="mtype: ${username}${wpm !== null ? ` ${wpm} wpm` : ''}">
  <title>mtype: ${username}${wpm !== null ? ` · ${wpm} wpm` : ''}</title>

  <defs>
    <clipPath id="r">
      <rect width="${totalW}" height="${H}" rx="${R}" ry="${R}"/>
    </clipPath>
    <linearGradient id="logoBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e2b714"/>
      <stop offset="100%" stop-color="#c9a010"/>
    </linearGradient>
    <linearGradient id="bodyBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a3d42"/>
      <stop offset="100%" stop-color="#313338"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#r)">
    <rect width="${totalW}" height="${H}" fill="url(#bodyBg)"/>

    <rect width="${Math.round(logoW)}" height="${H}" fill="url(#logoBg)"/>

    <rect width="${Math.round(logoW)}" height="1" fill="rgba(255,255,255,0.2)"/>

    <text
      x="${logoX + (logoW - LOGO_PAD_L - LOGO_PAD_R) / 2 + LOGO_PAD_L / 2 - 1}"
      y="${midY}"
      font-family="${FONT}"
      font-size="12"
      font-weight="600"
      fill="#1a1a1a"
      text-anchor="middle"
      dominant-baseline="auto"
      letter-spacing="0.3"
    >mtype</text>

    <rect x="${Math.round(logoW)}" y="0" width="${DIVIDER}" height="${H}" fill="rgba(0,0,0,0.25)"/>

    <text
      x="${userX}"
      y="${midY}"
      font-family="${FONT}"
      font-size="12"
      font-weight="500"
      fill="rgba(255,255,255,0.9)"
      text-anchor="start"
      dominant-baseline="auto"
      letter-spacing="0.2"
    >${escapeXml(username)}</text>

    ${wpmSection}

    <rect width="${totalW}" height="${H}" rx="${R}" ry="${R}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>
  </g>
</svg>`;
}

function errorSvg(msg) {
  const W = 160, H = 28, R = 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" rx="${R}" fill="#3a3d42"/>
    <text x="12" y="18" font-family="monospace" font-size="11" fill="rgba(255,255,255,0.4)">mtype · ${escapeXml(msg)}</text>
  </svg>`;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
