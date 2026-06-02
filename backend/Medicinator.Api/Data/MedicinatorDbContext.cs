using Medicinator.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Medicinator.Api.Data;

/// <summary>
/// Medicinator DBコンテキスト
/// </summary>
public sealed class MedicinatorDbContext(DbContextOptions<MedicinatorDbContext> options) : DbContext(options)
{
    /// <summary>
    /// Family
    /// </summary>
    public DbSet<Family> Families => Set<Family>();

    /// <summary>
    /// Family所属
    /// </summary>
    public DbSet<FamilyMembership> FamilyMemberships => Set<FamilyMembership>();

    /// <summary>
    /// Family招待
    /// </summary>
    public DbSet<FamilyInvite> FamilyInvites => Set<FamilyInvite>();

    /// <summary>
    /// 薬を飲む人
    /// </summary>
    public DbSet<Person> People => Set<Person>();

    /// <summary>
    /// 薬
    /// </summary>
    public DbSet<Medicine> Medicines => Set<Medicine>();

    /// <summary>
    /// 薬の服用タイミング
    /// </summary>
    public DbSet<MedicineScheduleTiming> MedicineScheduleTimings => Set<MedicineScheduleTiming>();

    /// <summary>
    /// 服薬記録
    /// </summary>
    public DbSet<MedicationIntake> MedicationIntakes => Set<MedicationIntake>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Family>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            ConfigureDateTimeOffset(entity.Property(x => x.CreatedAt));
        });

        modelBuilder.Entity<FamilyMembership>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FirebaseUid).HasMaxLength(160).IsRequired();
            entity.Property(x => x.DisplayName).HasMaxLength(120).IsRequired();
            ConfigureDateTimeOffset(entity.Property(x => x.JoinedAt));
            entity.HasIndex(x => new { x.FamilyId, x.FirebaseUid }).IsUnique();
            entity.HasOne(x => x.Family).WithMany(x => x.Memberships).HasForeignKey(x => x.FamilyId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FamilyInvite>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CodeHash).HasMaxLength(64).IsRequired();
            entity.Property(x => x.CreatedByFirebaseUid).HasMaxLength(160).IsRequired();
            ConfigureDateTimeOffset(entity.Property(x => x.CreatedAt));
            ConfigureDateTimeOffset(entity.Property(x => x.ExpiresAt));
            ConfigureDateTimeOffset(entity.Property(x => x.UsedAt));
            ConfigureDateTimeOffset(entity.Property(x => x.RevokedAt));
            entity.HasIndex(x => x.CodeHash).IsUnique();
            entity.HasIndex(x => new { x.FamilyId, x.ExpiresAt });
            entity.HasOne(x => x.Family).WithMany(x => x.Invites).HasForeignKey(x => x.FamilyId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Person>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Note).HasMaxLength(500);
            ConfigureDateTimeOffset(entity.Property(x => x.CreatedAt));
            entity.HasIndex(x => new { x.FamilyId, x.Name });
            entity.HasOne(x => x.Family).WithMany().HasForeignKey(x => x.FamilyId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Medicine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.DosageLabel).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Usage).HasMaxLength(500).IsRequired();
            ConfigureDateTimeOffset(entity.Property(x => x.CreatedAt));
            entity.HasIndex(x => new { x.FamilyId, x.PersonId, x.Name });
            entity.HasOne(x => x.Family).WithMany().HasForeignKey(x => x.FamilyId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Person).WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MedicineScheduleTiming>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(40).IsRequired();
            entity.HasIndex(x => new { x.FamilyId, x.MedicineId, x.Name }).IsUnique();
            entity.HasOne(x => x.Medicine).WithMany(x => x.ScheduleTimings).HasForeignKey(x => x.MedicineId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MedicationIntake>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TimingName).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Note).HasMaxLength(500);
            entity.Property(x => x.RecordedByFirebaseUid).HasMaxLength(160).IsRequired();
            ConfigureDateTimeOffset(entity.Property(x => x.TakenAt));
            ConfigureDateTimeOffset(entity.Property(x => x.CreatedAt));
            entity.HasIndex(x => new { x.FamilyId, x.TakenAt });
            entity.HasOne(x => x.Person).WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Medicine).WithMany().HasForeignKey(x => x.MedicineId).OnDelete(DeleteBehavior.Restrict);
        });
    }

    /// <summary>
    /// SQLiteで並び替え可能なDateTimeOffset変換を設定
    /// </summary>
    private static void ConfigureDateTimeOffset(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<DateTimeOffset> propertyBuilder)
    {
        propertyBuilder.HasConversion(
            value => value.UtcDateTime.Ticks,
            value => new DateTimeOffset(new DateTime(value, DateTimeKind.Utc)));
    }

    /// <summary>
    /// SQLiteで並び替え可能なNullable DateTimeOffset変換を設定
    /// </summary>
    private static void ConfigureDateTimeOffset(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<DateTimeOffset?> propertyBuilder)
    {
        propertyBuilder.HasConversion<long?>(
            value => value.HasValue ? value.Value.UtcDateTime.Ticks : null,
            value => value.HasValue ? new DateTimeOffset(new DateTime(value.Value, DateTimeKind.Utc)) : null);
    }
}
