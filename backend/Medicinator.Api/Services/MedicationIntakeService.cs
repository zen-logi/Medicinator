using Medicinator.Api.Data;
using Medicinator.Api.Dtos;
using Medicinator.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Medicinator.Api.Services;

/// <inheritdoc />
public sealed class MedicationIntakeService(MedicinatorDbContext dbContext, IFamilyService familyService) : IMedicationIntakeService
{
    /// <inheritdoc />
    public async Task<IReadOnlyList<MedicationIntakeResponse>> GetIntakesAsync(string firebaseUid, Guid familyId, DateOnly? day, CancellationToken cancellationToken)
    {
        await familyService.EnsureMemberAsync(firebaseUid, familyId, cancellationToken);

        var query = dbContext.MedicationIntakes
            .AsNoTracking()
            .Include(x => x.Person)
            .Include(x => x.Medicine)
            .Where(x => x.FamilyId == familyId);

        if (day is not null)
        {
            var (start, end) = GetApplicationDayRange(day.Value);
            query = query.Where(x => x.TakenAt >= start && x.TakenAt < end);
        }

        return await query
            .OrderByDescending(x => x.TakenAt)
            .Select(x => new MedicationIntakeResponse(
                x.Id,
                x.FamilyId,
                x.PersonId,
                x.Person!.Name,
                x.MedicineId,
                x.Medicine!.Name,
                x.TakenAt,
                x.TimingName,
                x.Note,
                x.RecordedByFirebaseUid,
                x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<MedicationIntakeResponse> CreateIntakeAsync(string firebaseUid, Guid familyId, CreateMedicationIntakeRequest request, CancellationToken cancellationToken)
    {
        await familyService.EnsureMemberAsync(firebaseUid, familyId, cancellationToken);
        var personExists = await dbContext.People.AnyAsync(x => x.FamilyId == familyId && x.Id == request.PersonId, cancellationToken);
        var medicineExists = await dbContext.Medicines.AnyAsync(
            x => x.FamilyId == familyId && x.Id == request.MedicineId && x.PersonId == request.PersonId,
            cancellationToken);

        if (!personExists || !medicineExists)
        {
            throw new KeyNotFoundException("薬または飲む人が見つからない");
        }

        var timingName = NormalizeRequired(request.TimingName, 40);
        var timingExists = await dbContext.MedicineScheduleTimings.AnyAsync(
            x => x.FamilyId == familyId && x.MedicineId == request.MedicineId && x.Name == timingName,
            cancellationToken);
        if (!timingExists)
        {
            throw new ArgumentException("服用タイミングが薬マスタに存在しない");
        }

        var intake = new MedicationIntake
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            PersonId = request.PersonId,
            MedicineId = request.MedicineId,
            TakenAt = request.TakenAt,
            TimingName = timingName,
            Note = NormalizeOptional(request.Note, 500),
            RecordedByFirebaseUid = firebaseUid,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.MedicationIntakes.Add(intake);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await dbContext.MedicationIntakes
            .AsNoTracking()
            .Include(x => x.Person)
            .Include(x => x.Medicine)
            .Where(x => x.Id == intake.Id)
            .Select(x => new MedicationIntakeResponse(
                x.Id,
                x.FamilyId,
                x.PersonId,
                x.Person!.Name,
                x.MedicineId,
                x.Medicine!.Name,
                x.TakenAt,
                x.TimingName,
                x.Note,
                x.RecordedByFirebaseUid,
                x.CreatedAt))
            .SingleAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task DeleteIntakeAsync(string firebaseUid, Guid familyId, DeleteMedicationIntakeRequest request, CancellationToken cancellationToken)
    {
        await familyService.EnsureMemberAsync(firebaseUid, familyId, cancellationToken);
        var timingName = NormalizeRequired(request.TimingName, 40);
        var (start, end) = GetApplicationDayRange(request.Day);
        var intakes = await dbContext.MedicationIntakes
            .Where(x =>
                x.FamilyId == familyId &&
                x.PersonId == request.PersonId &&
                x.MedicineId == request.MedicineId &&
                x.TimingName == timingName &&
                x.TakenAt >= start &&
                x.TakenAt < end)
            .ToListAsync(cancellationToken);

        dbContext.MedicationIntakes.RemoveRange(intakes);
        await dbContext.SaveChangesAsync(cancellationToken);
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

    /// <summary>
    /// アプリケーション基準日の検索範囲を取得
    /// </summary>
    private static (DateTimeOffset Start, DateTimeOffset End) GetApplicationDayRange(DateOnly day)
    {
        var offset = TimeSpan.FromHours(9);
        var start = new DateTimeOffset(day.ToDateTime(TimeOnly.MinValue), offset).ToUniversalTime();
        var end = new DateTimeOffset(day.AddDays(1).ToDateTime(TimeOnly.MinValue), offset).ToUniversalTime();
        return (start, end);
    }

    /// <summary>
    /// 任意文字列を正規化
    /// </summary>
    private static string? NormalizeOptional(string? value, int maxLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }
}
