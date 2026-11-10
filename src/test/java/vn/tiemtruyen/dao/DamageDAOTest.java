package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.Damage;
import vn.tiemtruyen.support.TestDatabase;

/** {@link DamageDAO#searchDamage(String)} và {@link DamageDAO#addDamage(Damage)} trên danh mục V2. */
class DamageDAOTest {

    private static TestDatabase db;

    @BeforeAll
    static void createDatabase() {
        db = TestDatabase.createMigrated();
    }

    @AfterAll
    static void dropDatabase() {
        db.close();
    }

    private static List<String> names(List<Damage> damages) {
        return damages.stream().map(Damage::getName).toList();
    }

    @Test
    void searchMatchesNameIgnoringCaseAndAccents() throws Exception {
        try (DamageDAO dao = new DamageDAO(db.connection())) {
            List<Damage> found = dao.searchDamage("Rách");
            assertEquals(List.of("Rách bìa", "Rách trang"), names(found));
            assertEquals("Bìa truyện bị rách", found.get(0).getDescription());
            assertTrue(found.get(0).getId() < found.get(1).getId());
            assertEquals(List.of("Rách bìa", "Rách trang"), names(dao.searchDamage("rach")));
            assertEquals(List.of("Vết bẩn, viết vẽ"), names(dao.searchDamage("Vết bẩn")));
            assertEquals(List.of(), dao.searchDamage("Cháy xém"));
        }
    }

    @Test
    void wildcardCharactersInKeywordAreLiteral() throws Exception {
        try (DamageDAO dao = new DamageDAO(db.connection())) {
            assertEquals(List.of(), dao.searchDamage("%"), "% phải khớp đúng chữ %, không phải mọi dòng");
            assertEquals(List.of(), dao.searchDamage("_"), "_ phải khớp đúng chữ _, không phải một kí tự bất kì");
            assertEquals(List.of(), dao.searchDamage("\\"));
            assertEquals(List.of("Vết bẩn, viết vẽ"), names(dao.searchDamage("n, v")));
        }
    }

    @Test
    void addAssignsIdAndDuplicateNameReturnsFalse() throws Exception {
        try (DamageDAO dao = new DamageDAO(db.connection())) {
            Damage glue = damage("Dính keo", "Trang truyện bị dính keo");
            assertTrue(dao.addDamage(glue));
            assertNotEquals(0, glue.getId());
            List<Damage> found = dao.searchDamage("Dính keo");
            assertEquals(1, found.size());
            assertEquals(glue.getId(), found.get(0).getId());

            int before = dao.searchDamage("").size();
            for (String duplicate : List.of("Rách bìa", "rach bia", "Dính keo")) {
                Damage again = damage(duplicate, null);
                assertFalse(dao.addDamage(again), duplicate);
                assertEquals(0, again.getId());
                assertTrue(dao.con().getAutoCommit());
            }
            assertEquals(before, dao.searchDamage("").size());
        }
    }

    private static Damage damage(String name, String description) {
        Damage damage = new Damage();
        damage.setName(name);
        damage.setDescription(description);
        return damage;
    }
}
