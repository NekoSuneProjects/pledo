using Microsoft.EntityFrameworkCore;
using Web.Constants;
using Web.Data;
using Web.Models;
using Web.Models.DTO;

namespace Web.Services;

public class SettingsService : ISettingsService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly CustomDbContext _customDbContext;

    public SettingsService(UnitOfWork unitOfWork, CustomDbContext customDbContext)
    {
        _unitOfWork = unitOfWork;
        _customDbContext = customDbContext;
    }

    public async Task<string> GetMovieDirectory()
    {
        var setting = await _unitOfWork.SettingRepository.GetById(SettingsConstants.MovieDirectoryKey);
        if (setting == null)
            throw new InvalidOperationException("The movie directory setting is missing in db.");
        return setting.Value;
    }

    public async Task<string> GetEpisodeDirectory()
    {
        var setting = await _unitOfWork.SettingRepository.GetById(SettingsConstants.EpisodeDirectoryKey);
        if (setting == null)
            throw new InvalidOperationException("The episode directory setting is missing in db.");
        return setting.Value;
    }

    public async Task<MovieFileTemplate> GetMovieFileTemplate()
    {
        var setting = await _unitOfWork.SettingRepository.GetById(SettingsConstants.MovieFileTemplateKey);
        if (setting == null)
            throw new InvalidOperationException("The movie file template setting is missing in db.");
        if (Enum.TryParse(setting.Value, out MovieFileTemplate fileTemplate))
            return fileTemplate;
        return default;
    }

    public async Task<EpisodeFileTemplate> GetEpisodeFileTemplate()
    {
        var setting = await _unitOfWork.SettingRepository.GetById(SettingsConstants.EpisodeFileTemplateKey);
        if (setting == null)
            throw new InvalidOperationException("The episode file template setting is missing in db.");
        if (Enum.TryParse(setting.Value, out EpisodeFileTemplate fileTemplate))
            return fileTemplate;
        return default;
    }

    public async Task<string?> GetPreferredResolution()
    {
        var setting = await _unitOfWork.SettingRepository.GetById(SettingsConstants.PreferredResolutionKey);
        return setting?.Value;
    }

    public async Task<string?> GetPreferredVideoCodec()
    {
        var setting = await _unitOfWork.SettingRepository.GetById(SettingsConstants.PreferredVideoCodec);
        return setting?.Value;
    }

    public async Task<bool> GetAutomaticMediaSyncEnabled()
    {
        var setting = await _unitOfWork.SettingRepository.GetById(SettingsConstants.AutomaticMediaSyncEnabledKey);
        if (setting == null)
            return true;
        return bool.TryParse(setting.Value, out var enabled) ? enabled : true;
    }

    public async Task<int> GetAutomaticMediaSyncIntervalMinutes()
    {
        var setting = await _unitOfWork.SettingRepository.GetById(SettingsConstants.AutomaticMediaSyncIntervalMinutesKey);
        return ParseIntSetting(setting?.Value, 15, minValue: 1);
    }

    public async Task<int> GetParallelDownloadLimit()
    {
        var setting = await _unitOfWork.SettingRepository.GetById(SettingsConstants.ParallelDownloadLimitKey);
        return ParseIntSetting(setting?.Value, 1, minValue: 1);
    }

    public Task<IEnumerable<SettingsResource>> GetSettings()
    {
        var settings = _unitOfWork.SettingRepository.GetAll();
        return Task.FromResult(settings.Select(x =>
        {
            var settingsResource = new SettingsResource()
            {
                Key = x.Key,
                Description = x.Description,
                Value = x.Value,
                Name = x.Name ?? "",
                Type = x.Type
            };
            AddOptions(settingsResource);
            return settingsResource;
        }));
    }

    private void AddOptions(SettingsResource settingsResource)
    {
        if (settingsResource.Key == SettingsConstants.EpisodeFileTemplateKey)
            settingsResource.Options = new[]
            {
                new Option(EpisodeFileTemplate.SeriesDirectoryAndFilenameFromServer.ToString(),
                    "<Download directory>/<Tv Show>/<Episode.ext>"),
                new Option(EpisodeFileTemplate.SeriesAndSeasonDirectoriesAndFilenameFromServer.ToString(),
                    "<Download directory>/<Tv Show>/<Season>/<Episode.ext>")
            };
        if (settingsResource.Key == SettingsConstants.MovieFileTemplateKey)
            settingsResource.Options = new[]
            {
                new Option(MovieFileTemplate.FilenameFromServer.ToString(), "<Download directory>/<Movie.ext>"),
                new Option(MovieFileTemplate.MovieDirectoryAndFilenameFromServer.ToString(),
                    "<Download directory>/<Movie>/<Movie.ext>")
            };
        if (settingsResource.Key == SettingsConstants.PreferredResolutionKey)
            settingsResource.Options = new[]
            {
                new Option("", "No preference"),
                new Option("sd", "SD"),
                new Option("480", "480p"),
                new Option("576", "576p"),
                new Option("720", "720p"),
                new Option("1080", "1080p"),
                new Option("2k", "2k"),
                new Option("4k", "4k"),
            };
        if (settingsResource.Key == SettingsConstants.PreferredVideoCodec)
            settingsResource.Options = new[]
            {
                new Option("", "No preference"),
                new Option("h264", "H.264"),
                new Option("hevc", "HEVC"),
                new Option("vc1", "VC-1"),
                new Option("mpeg2video", "MPEG-2"),
                new Option("mpeg4", "MPEG-4"),
                new Option("wmv3", "WMV3"),
                new Option("wmv2", "WMV2"),
                new Option("vp9", "VP9"),
                new Option("msmpeg4", "MS-MPEG4 V1"),
                new Option("msmpeg4v2", "MS-MPEG4 V1"),
                new Option("msmpeg4v3", "MS-MPEG4 V3"),
            };
        if (settingsResource.Key == SettingsConstants.AutomaticMediaSyncEnabledKey)
            settingsResource.Options = new[]
            {
                new Option("true", "Enabled"),
                new Option("false", "Disabled")
            };
        if (settingsResource.Key == SettingsConstants.AutomaticMediaSyncIntervalMinutesKey)
            settingsResource.Options = new[]
            {
                new Option("5", "Every 5 minutes"),
                new Option("10", "Every 10 minutes"),
                new Option("15", "Every 15 minutes"),
                new Option("30", "Every 30 minutes"),
                new Option("60", "Every hour"),
                new Option("180", "Every 3 hours"),
            };
        if (settingsResource.Key == SettingsConstants.ParallelDownloadLimitKey)
            settingsResource.Options = new[]
            {
                new Option("1", "Off (1 at a time)"),
                new Option("2", "2 downloads"),
                new Option("3", "3 downloads"),
                new Option("4", "4 downloads"),
            };
    }

    public Task ValidateSettings(IReadOnlyCollection<SettingsResource> settings)
    {
        ValidateDirectorySetting(settings.Single(x => x.Key == SettingsConstants.MovieDirectoryKey));
        ValidateDirectorySetting(settings.Single(x => x.Key == SettingsConstants.EpisodeDirectoryKey));
        return Task.CompletedTask;
    }

    private void ValidateDirectorySetting(SettingsResource setting)
    {
        try
        {
            Path.GetFullPath(setting.Value);
        }
        catch (Exception)
        {
            throw new ArgumentException($"{setting.Name} is not a valid directory.");
        }
    }

    public async Task UpdateSettings(IReadOnlyCollection<SettingsResource> settings)
    {
        foreach (var setting in settings)
        {
            var settingFromDb = await _unitOfWork.SettingRepository.GetById(setting.Key);
            if (settingFromDb == null)
                continue;

            settingFromDb.Value = setting.Value;
        }

        await _unitOfWork.Save();
    }

    public async Task<bool> ResetDatabase()
    {
        await _customDbContext.Database.CloseConnectionAsync();
        bool reset = await _customDbContext.Database.EnsureDeletedAsync();
        await _customDbContext.Database.MigrateAsync();
        DbInitializer.Initialize(_customDbContext);
        return reset;
    }

    private static int ParseIntSetting(string? value, int fallback, int minValue)
    {
        if (!int.TryParse(value, out var parsed))
            return fallback;
        return Math.Max(minValue, parsed);
    }
}
