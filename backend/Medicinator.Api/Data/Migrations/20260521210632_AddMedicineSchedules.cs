using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medicinator.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMedicineSchedules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DosageMemo",
                table: "Medicines",
                newName: "DosageLabel");

            migrationBuilder.Sql("UPDATE Medicines SET DosageLabel = '' WHERE DosageLabel IS NULL;");

            migrationBuilder.AddColumn<DateOnly>(
                name: "EndsOn",
                table: "Medicines",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "StartsOn",
                table: "Medicines",
                type: "TEXT",
                nullable: false,
                defaultValue: new DateOnly(1970, 1, 1));

            migrationBuilder.AddColumn<string>(
                name: "Usage",
                table: "Medicines",
                type: "TEXT",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TimingName",
                table: "MedicationIntakes",
                type: "TEXT",
                maxLength: 40,
                nullable: false,
                defaultValue: "未指定");

            migrationBuilder.CreateTable(
                name: "MedicineScheduleTimings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FamilyId = table.Column<Guid>(type: "TEXT", nullable: false),
                    MedicineId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicineScheduleTimings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MedicineScheduleTimings_Medicines_MedicineId",
                        column: x => x.MedicineId,
                        principalTable: "Medicines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MedicineScheduleTimings_FamilyId_MedicineId_Name",
                table: "MedicineScheduleTimings",
                columns: new[] { "FamilyId", "MedicineId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MedicineScheduleTimings_MedicineId",
                table: "MedicineScheduleTimings",
                column: "MedicineId");

            migrationBuilder.Sql(
                """
                INSERT INTO MedicineScheduleTimings (Id, FamilyId, MedicineId, Name, SortOrder)
                SELECT
                    lower(hex(randomblob(4))) || '-' ||
                    lower(hex(randomblob(2))) || '-' ||
                    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
                    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
                    lower(hex(randomblob(6))),
                    FamilyId,
                    Id,
                    '未指定',
                    0
                FROM Medicines
                ;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MedicineScheduleTimings");

            migrationBuilder.DropColumn(
                name: "EndsOn",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "StartsOn",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "Usage",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "TimingName",
                table: "MedicationIntakes");

            migrationBuilder.RenameColumn(
                name: "DosageLabel",
                table: "Medicines",
                newName: "DosageMemo");
        }
    }
}
