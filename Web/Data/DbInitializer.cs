using Web.Constants;
using Web.Models;
using Web.Services;

namespace Web.Data;

public static class DbInitializer
{
    public static void Initialize(CustomDbContext context)
    {
        context.AddSettingIfNotExist(new Setting()
        {
            Key = SettingsConstants.MovieDirectoryKey,
            Value = PreferencesProvider.GetDefaultMovieDirectory(),
            Name = "Download directory for movies",
            Type = "path"
        });
        context.AddSettingIfNotExist(new Setting()
        {
            Key = SettingsConstants.EpisodeDirectoryKey,
            Value = PreferencesProvider.GetDefaultTvShowDirectory(),
            Name = "Download directory for tv-shows",
            Type = "path"
        });
        context.AddSettingIfNotExist(new Setting()
        {
            Key = SettingsConstants.MovieFileTemplateKey,
            Value = MovieFileTemplate.FilenameFromServer.ToString(),
            Name = "Movie file template",
            Type = "enum"
        });
        context.AddSettingIfNotExist(new Setting()
        {
            Key = SettingsConstants.EpisodeFileTemplateKey,
            Value = EpisodeFileTemplate.SeriesAndSeasonDirectoriesAndFilenameFromServer.ToString(),
            Name = "Episode file template",
            Type = "enum"
        });
        context.AddSettingIfNotExist(new Setting()
        {
            Key = SettingsConstants.PreferredResolutionKey,
            Value = "",
            Name = "Preferred resolution",
            Description = "If there are multiple file versions, the one with preferred resolution is selected. If there is no match or there is no preference, first version found will be selected.",
            Type = "enum"
        });
        context.AddSettingIfNotExist(new Setting()
        {
            Key = SettingsConstants.PreferredVideoCodec,
            Value = "",
            Name = "Preferred video codec",
            Description = "If there are multiple file versions, the one with preferred video codec is selected. If there is no match or there is no preference, first version found will be selected.",
            Type = "enum"
        });
        context.AddSettingIfNotExist(new Setting()
        {
            Key = SettingsConstants.AutomaticMediaSyncEnabledKey,
            Value = "true",
            Name = "Automatic media sync",
            Description = "When enabled, pledo automatically scans all reachable Plex servers in the background and detects newly added or removed movies and TV shows.",
            Type = "enum"
        });
        context.AddSettingIfNotExist(new Setting()
        {
            Key = SettingsConstants.AutomaticMediaSyncIntervalMinutesKey,
            Value = "15",
            Name = "Automatic media sync interval",
            Description = "How often pledo should rescan online Plex servers for new or removed media.",
            Type = "enum"
        });
        context.AddSettingIfNotExist(new Setting()
        {
            Key = SettingsConstants.ParallelDownloadLimitKey,
            Value = "1",
            Name = "Parallel download limit",
            Description = "Set this above 1 to allow multiple downloads at the same time. The default value 1 keeps parallel downloading off.",
            Type = "enum"
        });
        context.SaveChanges();
    }

    private static bool AddSettingIfNotExist(this CustomDbContext context, Setting setting)
    {
        if (context.Settings.Any() && context.Settings.Find(setting.Key) != null) return false;
        context.Settings.Add(setting);
        return true;
    }
}
