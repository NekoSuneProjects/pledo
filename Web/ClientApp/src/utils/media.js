export function humanizeByteSize(size) {
  if (!size) {
    return "--";
  }

  const unitIndex = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  const value = size / Math.pow(1024, unitIndex);
  return `${value.toFixed(2) * 1} ${["B", "kB", "MB", "GB", "TB"][unitIndex]}`;
}

export function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getServer(knownServers = [], serverId) {
  return knownServers.find((server) => server.id === serverId);
}

export function getServerName(knownServers = [], serverId) {
  return getServer(knownServers, serverId)?.name ?? "Unknown server";
}

export function isServerOnline(knownServers = [], serverId) {
  return Boolean(getServer(knownServers, serverId)?.isOnline);
}

export function buildDirectDownloadLink({ knownServers = [], serverId, mediaFileKey }) {
  if (!mediaFileKey) {
    return "";
  }

  try {
    const server = getServer(knownServers, serverId);
    if (!server?.lastKnownUri || !server?.accessToken) {
      return "";
    }

    const url = new URL(mediaFileKey, server.lastKnownUri);
    url.searchParams.append("X-Plex-Token", server.accessToken);
    return url.toString();
  } catch (error) {
    console.log("An error occurred while building a direct Plex download link.", error);
    return "";
  }
}

export function buildQueueDownloadPath({ mediaType, mediaKey, mediaFileKey, season }) {
  const input = `api/download/${mediaType}/${mediaKey}`;
  const searchParams = new URLSearchParams();

  if (typeof season !== "undefined") {
    searchParams.set("season", season);
  }

  if (typeof mediaFileKey !== "undefined") {
    searchParams.set("mediaFileKey", mediaFileKey);
  }

  const queryString = searchParams.toString();
  return queryString ? `${input}?${queryString}` : input;
}

export function formatEpisodeCode(seasonNumber, episodeNumber) {
  const season = String(seasonNumber ?? 0).padStart(2, "0");
  const episode = String(episodeNumber ?? 0).padStart(2, "0");
  return `S${season}E${episode}`;
}

export function collectTvShowResolutions(tvShow) {
  return uniqueValues(
    (tvShow?.episodes ?? []).flatMap((episode) =>
      (episode.mediaFiles ?? []).map((file) => file.videoResolution)
    )
  );
}

export function collectTvShowSeasons(tvShow) {
  return uniqueValues((tvShow?.episodes ?? []).map((episode) => episode.seasonNumber))
    .map((season) => Number(season))
    .sort((left, right) => left - right);
}
