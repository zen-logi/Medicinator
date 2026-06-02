using Medicinator.Api.Data;
using Medicinator.Api.Dtos;
using Medicinator.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Medicinator.Api.Services;

/// <inheritdoc />
public sealed class MedicineService(MedicinatorDbContext dbContext, IFamilyService familyService) : IMedicineService
{
    /// <inheritdoc />
    public async Task<IReadOnlyList<MedicineResponse>> GetMedicinesAsync(string firebaseUid, Guid familyId, CancellationToken cancellationToken)
    {
        await familyService.EnsureMemberAsync(firebaseUid, familyId, cancellationToken);
        var medicines = await dbContext.Medicines
            .AsNoTracking()
            .Include(x => x.ScheduleTimings)
            .Where(x => x.FamilyId == familyId)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return medicines.Select(ToResponse).ToList();
    }

    /// <inheritdoc />
    public async Task<MedicineResponse> CreateMedicineAsync(string firebaseUid, Guid familyId, CreateMedicineRequest request, CancellationToken cancellationToken)
    {
        await familyService.EnsureAdminAsync(firebaseUid, familyId, cancellationToken);
        await EnsurePersonExistsAsync(familyId, request.PersonId, cancellationToken);
        var medicine = new Medicine
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            PersonId = request.PersonId,
            Name = NormalizeRequired(request.Name, 120),
            DosageLabel = NormalizeRequired(request.DosageLabel, 120),
            Usage = NormalizeRequired(request.Usage, 500),
            StartsOn = request.StartsOn,
            EndsOn = NormalizeEndsOn(request.StartsOn, request.EndsOn),
            CreatedAt = DateTimeOffset.UtcNow
        };
        SetTimings(medicine, NormalizeTimings(request.TimingNames));

        dbContext.Medicines.Add(medicine);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToResponse(medicine);
    }

    /// <inheritdoc />
    public async Task<MedicineResponse> UpdateMedicineAsync(string firebaseUid, Guid familyId, Guid medicineId, UpdateMedicineRequest request, CancellationToken cancellationToken)
    {
        await familyService.EnsureAdminAsync(firebaseUid, familyId, cancellationToken);
        var medicine = await dbContext.Medicines.SingleOrDefaultAsync(x => x.FamilyId == familyId && x.Id == medicineId, cancellationToken)
            ?? throw new KeyNotFoundException("薬が見つからない");
        await EnsurePersonExistsAsync(familyId, request.PersonId, cancellationToken);
        await dbContext.Entry(medicine).Collection(x => x.ScheduleTimings).LoadAsync(cancellationToken);

        medicine.PersonId = request.PersonId;
        medicine.Name = NormalizeRequired(request.Name, 120);
        medicine.DosageLabel = NormalizeRequired(request.DosageLabel, 120);
        medicine.Usage = NormalizeRequired(request.Usage, 500);
        medicine.StartsOn = request.StartsOn;
        medicine.EndsOn = NormalizeEndsOn(request.StartsOn, request.EndsOn);
        medicine.ScheduleTimings.Clear();
        SetTimings(medicine, NormalizeTimings(request.TimingNames));
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToResponse(medicine);
    }

    /// <summary>
    /// レスポンスへ変換
    /// </summary>
    private static MedicineResponse ToResponse(Medicine medicine) => new(
        medicine.Id,
        medicine.FamilyId,
        medicine.PersonId,
        medicine.Name,
        medicine.DosageLabel,
        medicine.Usage,
        medicine.StartsOn,
        medicine.EndsOn,
        medicine.ScheduleTimings.OrderBy(x => x.SortOrder).Select(x => x.Name).ToList(),
        medicine.CreatedAt);

    /// <summary>
    /// 飲む人の存在を検証
    /// </summary>
    private async Task EnsurePersonExistsAsync(Guid familyId, Guid personId, CancellationToken cancellationToken)
    {
        var exists = await dbContext.People.AnyAsync(x => x.FamilyId == familyId && x.Id == personId, cancellationToken);
        if (!exists)
        {
            throw new KeyNotFoundException("飲む人が見つからない");
        }
    }

    /// <summary>
    /// 終了日を検証
    /// </summary>
    private static DateOnly? NormalizeEndsOn(DateOnly startsOn, DateOnly? endsOn)
    {
        if (endsOn is not null && endsOn < startsOn)
        {
            throw new ArgumentException("服用終了日は服用開始日以降");
        }

        return endsOn;
    }

    /// <summary>
    /// 服用タイミングを正規化
    /// </summary>
    private static IReadOnlyList<string> NormalizeTimings(IReadOnlyList<string>? timingNames)
    {
        if (timingNames is null || timingNames.Count == 0)
        {
            throw new ArgumentException("服用タイミングが空");
        }

        var normalized = timingNames
            .Select(x => NormalizeRequired(x, 40))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (normalized.Count > 12)
        {
            throw new ArgumentException("服用タイミングが多すぎる");
        }

        return normalized;
    }

    /// <summary>
    /// 服用タイミングを設定
    /// </summary>
    private static void SetTimings(Medicine medicine, IReadOnlyList<string> timingNames)
    {
        for (var index = 0; index < timingNames.Count; index++)
        {
            medicine.ScheduleTimings.Add(new MedicineScheduleTiming
            {
                Id = Guid.NewGuid(),
                FamilyId = medicine.FamilyId,
                MedicineId = medicine.Id,
                Name = timingNames[index],
                SortOrder = index
            });
        }
    }

    /// <summary>
    /// 必須文字列を正規化
    /// </summary>
    private static string NormalizeRequired(string? value, int maxLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
        {
            throw new ArgumentException("必須項目が空");
        }

        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }

}
