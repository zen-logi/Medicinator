using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Medicinator.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMedicinePerson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Medicines_FamilyId_Name",
                table: "Medicines");

            migrationBuilder.AddColumn<Guid>(
                name: "PersonId",
                table: "Medicines",
                type: "TEXT",
                nullable: true);

            migrationBuilder.Sql("""
                INSERT INTO People (Id, FamilyId, Name, Note, CreatedAt)
                SELECT
                    lower(hex(randomblob(4))) || '-' ||
                    lower(hex(randomblob(2))) || '-' ||
                    lower(hex(randomblob(2))) || '-' ||
                    lower(hex(randomblob(2))) || '-' ||
                    lower(hex(randomblob(6))),
                    Families.Id,
                    '未設定',
                    '移行時に作成',
                    0
                FROM Families
                WHERE EXISTS (
                    SELECT 1
                    FROM Medicines
                    WHERE Medicines.FamilyId = Families.Id
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM People
                    WHERE People.FamilyId = Families.Id
                );
                """);

            migrationBuilder.Sql("""
                UPDATE Medicines
                SET PersonId = (
                    SELECT People.Id
                    FROM People
                    WHERE People.FamilyId = Medicines.FamilyId
                    ORDER BY People.CreatedAt, People.Name
                    LIMIT 1
                )
                WHERE PersonId IS NULL;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "PersonId",
                table: "Medicines",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_FamilyId_PersonId_Name",
                table: "Medicines",
                columns: new[] { "FamilyId", "PersonId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_PersonId",
                table: "Medicines",
                column: "PersonId");

            migrationBuilder.AddForeignKey(
                name: "FK_Medicines_People_PersonId",
                table: "Medicines",
                column: "PersonId",
                principalTable: "People",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Medicines_People_PersonId",
                table: "Medicines");

            migrationBuilder.DropIndex(
                name: "IX_Medicines_FamilyId_PersonId_Name",
                table: "Medicines");

            migrationBuilder.DropIndex(
                name: "IX_Medicines_PersonId",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "PersonId",
                table: "Medicines");

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_FamilyId_Name",
                table: "Medicines",
                columns: new[] { "FamilyId", "Name" });
        }
    }
}
