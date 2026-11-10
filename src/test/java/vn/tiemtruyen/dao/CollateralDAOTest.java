package vn.tiemtruyen.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.Collateral;
import vn.tiemtruyen.support.TestDatabase;

/** {@link CollateralDAO#searchCollateral(String)} và {@link CollateralDAO#addCollateral(Collateral)}. */
class CollateralDAOTest {

    private static TestDatabase db;

    @BeforeAll
    static void createDatabase() {
        db = TestDatabase.createMigrated();
    }

    @AfterAll
    static void dropDatabase() {
        db.close();
    }

    private static List<String> names(List<Collateral> collaterals) {
        return collaterals.stream().map(Collateral::getName).toList();
    }

    @Test
    void searchMatchesNameIgnoringCaseAndAccents() throws Exception {
        try (CollateralDAO dao = new CollateralDAO(db.connection())) {
            List<Collateral> found = dao.searchCollateral("Căn cước");
            assertEquals(List.of("Căn cước công dân"), names(found));
            assertEquals("Giữ bản gốc căn cước công dân của khách hàng", found.get(0).getDescription());
            assertEquals(List.of("Tiền mặt"), names(dao.searchCollateral("tien mat")));
            assertEquals(List.of(), dao.searchCollateral("Sổ đỏ"));
        }
    }

    @Test
    void addAssignsIdAndDuplicateNameReturnsFalse() throws Exception {
        try (CollateralDAO dao = new CollateralDAO(db.connection())) {
            Collateral passport = collateral("Hộ chiếu", "Giữ bản gốc hộ chiếu của khách hàng");
            assertTrue(dao.addCollateral(passport));
            assertNotEquals(0, passport.getId());
            List<Collateral> found = dao.searchCollateral("Hộ chiếu");
            assertEquals(1, found.size());
            assertEquals(passport.getId(), found.get(0).getId());

            int before = dao.searchCollateral("").size();
            for (String duplicate : List.of("Tiền mặt", "TIEN MAT", "Hộ chiếu")) {
                Collateral again = collateral(duplicate, null);
                assertFalse(dao.addCollateral(again), duplicate);
                assertEquals(0, again.getId());
                assertTrue(dao.con().getAutoCommit());
            }
            assertEquals(before, dao.searchCollateral("").size());
        }
    }

    private static Collateral collateral(String name, String description) {
        Collateral collateral = new Collateral();
        collateral.setName(name);
        collateral.setDescription(description);
        return collateral;
    }
}
