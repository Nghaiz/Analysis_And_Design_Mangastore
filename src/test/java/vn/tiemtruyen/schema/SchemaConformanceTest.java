package vn.tiemtruyen.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.support.ContractsDoc;
import vn.tiemtruyen.support.TestDatabase;

/**
 * Schema sau migration (V1, V2, V10 e2e trên {@code mysql:8.4.13}) phải đúng bảng máy đọc của
 * {@code docs/contracts.md} §2 (SSOT), và {@code docs/schema.md} §3 phải khớp contracts.md.
 */
class SchemaConformanceTest {

    private static final Path SCHEMA_DOC = Path.of("docs", "schema.md");
    private static final String V1 = "db/migration/V1__schema.sql";
    private static final String CONTRACTS = ContractsDoc.PATH.toString().replace('\\', '/');
    private static final String SCHEMA = SCHEMA_DOC.toString().replace('\\', '/');
    /** Bảng lịch sử của Flyway, đọc từ cấu hình mặc định (MigrationListener không đổi tên bảng). */
    private static final Set<String> IGNORED = Set.of(new FluentConfiguration().getTable());

    private static TestDatabase db;

    @BeforeAll
    static void createDatabase() {
        db = TestDatabase.createMigrated();
    }

    @AfterAll
    static void dropDatabase() {
        db.close();
    }

    @Test
    void contractsDescribesThirteenTables() {
        assertEquals(13, contract().size(), "docs/contracts.md §2 phải có 13 tiêu đề ### tblX: " + contract().keySet());
    }

    @Test
    void migratedSchemaMatchesContracts() throws Exception {
        List<String> diffs = diffAgainstContracts(db);
        assertTrue(diffs.isEmpty(), "Schema sau migration lệch docs/contracts.md §2:\n" + String.join("\n", diffs));
    }

    @Test
    void schemaDocMatchesContracts() {
        assertTrue(Files.isRegularFile(SCHEMA_DOC), SCHEMA + " bắt buộc có (bản chép máy đọc của contracts §2)");
        List<String> diffs = SchemaDiff.docs(contract(), CONTRACTS, SchemaDoc.parse(SCHEMA_DOC), SCHEMA);
        assertTrue(diffs.isEmpty(), SCHEMA + " lệch docs/contracts.md §2 (contracts thắng, chép lại bảng):\n"
                + String.join("\n", diffs));
    }

    /** Kiểm chính phải đỏ được: chạy bản chép V1 bị sửa và đòi đúng từng chỗ lệch được nêu tên. */
    @Test
    void checkReportsEveryDriftInMutatedCopyOfV1() throws Exception {
        String sql = v1();
        sql = mutate(sql, "phone VARCHAR\\(10\\)", "phone VARCHAR(11)");
        sql = mutate(sql, "description VARCHAR\\(255\\) NULL,\\s*PRIMARY KEY \\(id\\),\\s*CONSTRAINT uq_tblDamage",
                "description VARCHAR(255) NULL, extraCol INT NULL, PRIMARY KEY (id), CONSTRAINT uq_tblDamage");
        sql = mutate(sql, "publishYear INT NULL,", "");
        sql = mutate(sql, "CONSTRAINT uq_tblCart_clientId UNIQUE \\(clientId\\),", "");
        sql = mutate(sql, "staffId INT NULL", "staffId INT NOT NULL");
        sql = mutate(sql, "discount FLOAT NOT NULL DEFAULT 0", "discount FLOAT NOT NULL DEFAULT 1");
        sql = mutate(sql, ",\\s*INDEX ix_tblBook_author \\(author\\)", "");
        sql = sql + ";\nCREATE TABLE tblExtra (id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY (id))";
        try (TestDatabase mutated = TestDatabase.createEmpty()) {
            execute(mutated, sql);
            String report = String.join("\n", diffAgainstContracts(mutated));
            for (List<String> expected : List.of(
                    List.of("tblClient.phone: kiểu", "varchar(11)"),
                    List.of("tblDamage.extraCol: cột thừa"),
                    List.of("tblBook.publishYear: cột", "thiếu"),
                    List.of("tblCart.clientId: khoá", "[FK→tblClient.userId]"),
                    List.of("tblRentalBill.staffId: Null", "NOT NULL"),
                    List.of("tblRentalBill: mặc định", "discount=1"),
                    List.of("tblBook.author:", "index"),
                    List.of("tblExtra: bảng có trong DB"))) {
                assertTrue(report.lines().anyMatch(line -> expected.stream().allMatch(line::contains)),
                        "Không thấy dòng chứa " + expected + " trong báo cáo lệch:\n" + report);
            }
        }
    }

    private static List<String> diffAgainstContracts(TestDatabase database) throws Exception {
        try (Connection con = database.connection()) {
            return SchemaDiff.live(contract(), CONTRACTS, rules(), LiveSchema.read(con, database.name()), IGNORED);
        }
    }

    private static Map<String, TableSpec> contract() {
        return SchemaDoc.parse(ContractsDoc.PATH);
    }

    private static DocRules rules() throws IOException {
        return DocRules.from(Files.readString(ContractsDoc.PATH, StandardCharsets.UTF_8));
    }

    private static String v1() throws IOException {
        try (InputStream in = SchemaConformanceTest.class.getClassLoader().getResourceAsStream(V1)) {
            assertNotNull(in, "Không thấy " + V1 + " trên classpath");
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String mutate(String sql, String regex, String replacement) {
        String changed = sql.replaceFirst(regex, replacement);
        assertNotEquals(sql, changed, "Đột biến /" + regex + "/ không khớp V1 nào: sửa test theo V1 mới");
        return changed;
    }

    private static void execute(TestDatabase database, String script) throws Exception {
        String withoutComments = script.lines().filter(line -> !line.strip().startsWith("--"))
                .reduce("", (left, right) -> left + right + "\n");
        try (Connection con = database.connection(); Statement statement = con.createStatement()) {
            for (String sql : withoutComments.split(";")) {
                if (!sql.isBlank()) {
                    statement.execute(sql);
                }
            }
        }
    }
}
