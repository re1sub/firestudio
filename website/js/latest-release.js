/**
 * Fetches the latest GitHub release for Firestudio and updates the hero badge
 * (and optional JSON-LD) on the page. No website redeploy needed for new versions.
 */
(function () {
  const REPO = 'Flowdesktech/firestudio';
  const RELEASES_URL = 'https://github.com/Flowdesktech/firestudio/releases';
  const API_URL = 'https://api.github.com/repos/' + REPO + '/releases/latest';

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isGenericReleaseName(tag, releaseName) {
    const name = (releaseName || '').trim();
    if (!name) return true;

    const withoutPrefix = name.replace(/^Firestudio\s+/i, '').trim();
    const tagCore = (tag || '').replace(/^v/i, '');
    return (
      withoutPrefix.toLowerCase() === (tag || '').toLowerCase() ||
      withoutPrefix === tagCore ||
      /^v?[\d.]+$/.test(withoutPrefix)
    );
  }

  /** Subtitle from GitHub release title (`name`), e.g. "v1.6.0 - Named Firestore Database Support". */
  function subtitleFromReleaseName(tag, releaseName) {
    const tagName = (tag || '').trim();
    const name = (releaseName || '').trim();
    if (!name || !tagName) return '';

    const withoutPrefix = name.replace(/^Firestudio\s+/i, '').trim();
    const versionSubtitle = withoutPrefix.match(new RegExp('^' + escapeRegex(tagName) + '\\s*[—–-]\\s*(.+)$', 'i'));
    if (versionSubtitle) return versionSubtitle[1].trim();

    if (isGenericReleaseName(tagName, name)) return '';

    const tagCore = tagName.replace(/^v/i, '');
    if (!withoutPrefix.toLowerCase().includes(tagCore.toLowerCase())) {
      return withoutPrefix;
    }

    return '';
  }

  /** When the release title is generic ("Firestudio v1.8.0"), use the first highlight from notes. */
  function subtitleFromReleaseBody(body) {
    if (!body) return '';

    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || /^###\s+Setup/i.test(trimmed) || /^\*\*Full Changelog\*\*/i.test(trimmed)) {
        continue;
      }

      const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        const text = heading[1].replace(/\*\*/g, '').trim();
        if (text && !/^Firestudio\s+v?[\d.]+$/i.test(text) && !/^what'?s changed$/i.test(text)) {
          return text;
        }
        continue;
      }

      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        let text = bullet[1].replace(/\*\*/g, '').trim();
        const short = text.split(/\s+[-–—]\s+/)[0].trim();
        if (short.length <= 72) return short;
        return text.slice(0, 69) + '…';
      }
    }

    return '';
  }

  function formatReleaseBadge(tagName, releaseName, releaseBody) {
    const tag = (tagName || '').trim();
    if (!tag) return '✨ Latest release';

    let subtitle = subtitleFromReleaseName(tag, releaseName);
    if (!subtitle && isGenericReleaseName(tag, releaseName)) {
      subtitle = subtitleFromReleaseBody(releaseBody);
    }

    if (subtitle) return '✨ ' + tag + ' - ' + subtitle;
    return '✨ ' + tag;
  }

  function applyRelease(data) {
    const badge = document.getElementById('release-badge');
    if (badge) {
      badge.textContent = formatReleaseBadge(data.tag_name, data.name, data.body);
      if (data.html_url) badge.href = data.html_url;
    }

    const version = (data.tag_name || '').replace(/^v/i, '');
    const ldEl = document.getElementById('release-ld-json');
    if (ldEl && version) {
      try {
        const ld = JSON.parse(ldEl.textContent);
        ld.softwareVersion = version;
        ld.downloadUrl = data.html_url || RELEASES_URL;
        if (data.name) ld.name = data.name;
        ldEl.textContent = JSON.stringify(ld);
      } catch (e) {
        void e;
      }
    }
  }

  function showFallback() {
    const badge = document.getElementById('release-badge');
    if (badge) {
      badge.textContent = '✨ Latest on GitHub';
      badge.href = RELEASES_URL;
    }
  }

  async function loadLatestRelease() {
    try {
      const res = await fetch(API_URL, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      applyRelease(await res.json());
    } catch (e) {
      void e;
      showFallback();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLatestRelease);
  } else {
    loadLatestRelease();
  }
})();
