using Medicinator.Api.Data;
using Medicinator.Api.Dtos;
using Medicinator.Api.Models;
using Medicinator.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Medicinator.Api.Tests;

/// <summary>
/// Family境界テスト
/// </summary>
public sealed class FamilyBoundaryTests
{
    [Fact]
    public async Task OtherFamilyMemberCannotReadPeople()
    {
        await using var database = new TestDatabase();
        var familyService = new FamilyService(database.Context);
        var personService = new PersonService(database.Context, familyService);

        var firstFamily = await familyService.CreateFamilyAsync("user-a", new CreateFamilyRequest("佐藤家", "A"), CancellationToken.None);
        await familyService.CreateFamilyAsync("user-b", new CreateFamilyRequest("鈴木家", "B"), CancellationToken.None);
        await personService.CreatePersonAsync("user-a", firstFamily.Id, new CreatePersonRequest("祖母", null), CancellationToken.None);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            personService.GetPeopleAsync("user-b", firstFamily.Id, CancellationToken.None));
    }

    [Fact]
    public async Task MemberCanCreateIntakeForOwnerManagedMedicine()
    {
        await using var database = new TestDatabase();
        var familyService = new FamilyService(database.Context);
        var personService = new PersonService(database.Context, familyService);
        var medicineService = new MedicineService(database.Context, familyService);
        var intakeService = new MedicationIntakeService(database.Context, familyService);

        var family = await familyService.CreateFamilyAsync("owner", new CreateFamilyRequest("田中家", "Owner"), CancellationToken.None);
        var invite = await familyService.CreateInviteAsync("owner", family.Id, CancellationToken.None);
        await familyService.JoinFamilyAsync("member", new JoinFamilyRequest(invite.InviteCode, "Member"), CancellationToken.None);
        var person = await personService.CreatePersonAsync("owner", family.Id, new CreatePersonRequest("父", null), CancellationToken.None);
        var medicine = await medicineService.CreateMedicineAsync(
            "owner",
            family.Id,
            new CreateMedicineRequest(
                person.Id,
                "朝の薬",
                "10mg 1錠",
                "食後に服用",
                DateOnly.FromDateTime(DateTime.UtcNow),
                null,
                ["朝", "夕"]),
            CancellationToken.None);

        var intake = await intakeService.CreateIntakeAsync(
            "member",
            family.Id,
            new CreateMedicationIntakeRequest(person.Id, medicine.Id, DateTimeOffset.UtcNow, "朝", "朝食後"),
            CancellationToken.None);

        Assert.Equal("父", intake.PersonName);
        Assert.Equal("朝の薬", intake.MedicineName);
        Assert.Equal("朝", intake.TimingName);
        Assert.Equal(["朝", "夕"], medicine.TimingNames);
    }

    [Fact]
    public async Task IntakeTimingMustExistInMedicineSchedule()
    {
        await using var database = new TestDatabase();
        var familyService = new FamilyService(database.Context);
        var personService = new PersonService(database.Context, familyService);
        var medicineService = new MedicineService(database.Context, familyService);
        var intakeService = new MedicationIntakeService(database.Context, familyService);

        var family = await familyService.CreateFamilyAsync("owner", new CreateFamilyRequest("田中家", "Owner"), CancellationToken.None);
        var person = await personService.CreatePersonAsync("owner", family.Id, new CreatePersonRequest("父", null), CancellationToken.None);
        var medicine = await medicineService.CreateMedicineAsync(
            "owner",
            family.Id,
            new CreateMedicineRequest(
                person.Id,
                "夜の薬",
                "5mg",
                "就寝前に服用",
                DateOnly.FromDateTime(DateTime.UtcNow),
                null,
                ["寝る前"]),
            CancellationToken.None);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            intakeService.CreateIntakeAsync(
                "owner",
                family.Id,
                new CreateMedicationIntakeRequest(person.Id, medicine.Id, DateTimeOffset.UtcNow, "朝", null),
                CancellationToken.None));
    }

    [Fact]
    public async Task MemberCanUpdateAndDeletePersonWithoutLinkedMedicine()
    {
        await using var database = new TestDatabase();
        var familyService = new FamilyService(database.Context);
        var personService = new PersonService(database.Context, familyService);

        var family = await familyService.CreateFamilyAsync("owner", new CreateFamilyRequest("田中家", "Owner"), CancellationToken.None);
        var person = await personService.CreatePersonAsync("owner", family.Id, new CreatePersonRequest("父", "本人"), CancellationToken.None);

        var updated = await personService.UpdatePersonAsync(
            "owner",
            family.Id,
            person.Id,
            new UpdatePersonRequest("父 編集後", "管理対象"),
            CancellationToken.None);
        await personService.DeletePersonAsync("owner", family.Id, person.Id, CancellationToken.None);
        var people = await personService.GetPeopleAsync("owner", family.Id, CancellationToken.None);

        Assert.Equal("父 編集後", updated.Name);
        Assert.Empty(people);
    }

    [Fact]
    public async Task CannotDeletePersonWithLinkedMedicine()
    {
        await using var database = new TestDatabase();
        var familyService = new FamilyService(database.Context);
        var personService = new PersonService(database.Context, familyService);
        var medicineService = new MedicineService(database.Context, familyService);

        var family = await familyService.CreateFamilyAsync("owner", new CreateFamilyRequest("田中家", "Owner"), CancellationToken.None);
        var person = await personService.CreatePersonAsync("owner", family.Id, new CreatePersonRequest("父", null), CancellationToken.None);
        await medicineService.CreateMedicineAsync(
            "owner",
            family.Id,
            new CreateMedicineRequest(
                person.Id,
                "朝の薬",
                "10mg 1錠",
                "食後に服用",
                DateOnly.FromDateTime(DateTime.UtcNow),
                null,
                ["朝"]),
            CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            personService.DeletePersonAsync("owner", family.Id, person.Id, CancellationToken.None));
    }

    [Fact]
    public async Task MemberCannotManageMasterData()
    {
        await using var database = new TestDatabase();
        var familyService = new FamilyService(database.Context);
        var personService = new PersonService(database.Context, familyService);
        var medicineService = new MedicineService(database.Context, familyService);

        var family = await familyService.CreateFamilyAsync("owner", new CreateFamilyRequest("田中家", "Owner"), CancellationToken.None);
        var invite = await familyService.CreateInviteAsync("owner", family.Id, CancellationToken.None);
        await familyService.JoinFamilyAsync("member", new JoinFamilyRequest(invite.InviteCode, "Member"), CancellationToken.None);
        var person = await personService.CreatePersonAsync("owner", family.Id, new CreatePersonRequest("父", null), CancellationToken.None);
        var medicine = await medicineService.CreateMedicineAsync(
            "owner",
            family.Id,
            new CreateMedicineRequest(
                person.Id,
                "朝の薬",
                "10mg 1錠",
                "食後に服用",
                DateOnly.FromDateTime(DateTime.UtcNow),
                null,
                ["朝"]),
            CancellationToken.None);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            personService.CreatePersonAsync("member", family.Id, new CreatePersonRequest("母", null), CancellationToken.None));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            personService.UpdatePersonAsync("member", family.Id, person.Id, new UpdatePersonRequest("父 編集", null), CancellationToken.None));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            personService.DeletePersonAsync("member", family.Id, person.Id, CancellationToken.None));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            medicineService.CreateMedicineAsync(
                "member",
                family.Id,
                new CreateMedicineRequest(person.Id, "昼の薬", "5mg", "食後に服用", DateOnly.FromDateTime(DateTime.UtcNow), null, ["昼"]),
                CancellationToken.None));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            medicineService.UpdateMedicineAsync(
                "member",
                family.Id,
                medicine.Id,
                new UpdateMedicineRequest(person.Id, "朝の薬 編集", "10mg", "食後に服用", DateOnly.FromDateTime(DateTime.UtcNow), null, ["朝"]),
                CancellationToken.None));
    }

    [Fact]
    public async Task InviteCanBeUsedOnlyOnce()
    {
        await using var database = new TestDatabase();
        var familyService = new FamilyService(database.Context);

        var family = await familyService.CreateFamilyAsync("owner", new CreateFamilyRequest("田中家", "Owner"), CancellationToken.None);
        var invite = await familyService.CreateInviteAsync("owner", family.Id, CancellationToken.None);

        var joined = await familyService.JoinFamilyAsync("member", new JoinFamilyRequest(invite.InviteCode, "Member"), CancellationToken.None);

        Assert.Equal(FamilyRole.Member, joined.Role);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            familyService.JoinFamilyAsync("other", new JoinFamilyRequest(invite.InviteCode, "Other"), CancellationToken.None));
    }

    /// <summary>
    /// SQLiteインメモリDB
    /// </summary>
    private sealed class TestDatabase : IAsyncDisposable
    {
        private readonly SqliteConnection connection;

        public TestDatabase()
        {
            connection = new SqliteConnection("Data Source=:memory:");
            connection.Open();

            var options = new DbContextOptionsBuilder<MedicinatorDbContext>()
                .UseSqlite(connection)
                .Options;

            Context = new MedicinatorDbContext(options);
            Context.Database.EnsureCreated();
        }

        public MedicinatorDbContext Context { get; }

        public async ValueTask DisposeAsync()
        {
            await Context.DisposeAsync();
            await connection.DisposeAsync();
        }
    }
}
