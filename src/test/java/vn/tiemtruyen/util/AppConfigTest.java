package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class AppConfigTest {

    @Test
    void secretWithoutValueFailsAndNamesTheVariable() {
        AppConfig config = AppConfig.of(Map.of());
        IllegalStateException e = assertThrows(IllegalStateException.class, config::dbPassword);
        assertTrue(e.getMessage().contains("APP_DB_PASSWORD"), e.getMessage());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "\t"})
    void blankSecretCountsAsMissing(String blank) {
        AppConfig config = AppConfig.of(Map.of("APP_DB_PASSWORD", blank));
        assertThrows(IllegalStateException.class, config::dbPassword);
    }

    @Test
    void requiredValuesAreReadAndStripped() {
        AppConfig config = AppConfig.of(Map.of(
                "APP_DB_URL", " jdbc:mysql://db:3306/tiemtruyen ",
                "APP_DB_USER", "tiemtruyen",
                "APP_DB_PASSWORD", "s3cret"));
        assertEquals("jdbc:mysql://db:3306/tiemtruyen", config.dbUrl());
        assertEquals("tiemtruyen", config.dbUser());
        assertEquals("s3cret", config.dbPassword());
    }

    @Test
    void errorMessageNeverContainsTheSecretValue() {
        AppConfig config = AppConfig.of(Map.of("APP_DB_POOL_SIZE", "abc", "APP_DB_PASSWORD", "s3cret"));
        IllegalStateException e = assertThrows(IllegalStateException.class, config::dbPoolSize);
        assertFalse(e.getMessage().contains("s3cret"));
    }

    @Test
    void documentedDefaultsApplyOnlyToNonSecrets() {
        AppConfig config = AppConfig.of(Map.of());
        assertEquals(10, config.dbPoolSize());
        assertFalse(config.viteDev());
        assertEquals("/covers", config.coversBaseUrl());
        assertThrows(IllegalStateException.class, config::dbUrl);
        assertThrows(IllegalStateException.class, config::dbUser);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "101", "-3", "abc", "1.5"})
    void invalidPoolSizeIsRejected(String value) {
        AppConfig config = AppConfig.of(Map.of("APP_DB_POOL_SIZE", value));
        IllegalStateException e = assertThrows(IllegalStateException.class, config::dbPoolSize);
        assertTrue(e.getMessage().contains("APP_DB_POOL_SIZE"), e.getMessage());
    }

    @Test
    void poolSizeIsParsed() {
        assertEquals(25, AppConfig.of(Map.of("APP_DB_POOL_SIZE", "25")).dbPoolSize());
    }

    @ParameterizedTest
    @ValueSource(strings = {"yes", "TRUE", "1", "on"})
    void flagAcceptsOnlyTrueOrFalse(String value) {
        AppConfig config = AppConfig.of(Map.of("APP_VITE_DEV", value));
        IllegalStateException e = assertThrows(IllegalStateException.class, config::viteDev);
        assertTrue(e.getMessage().contains("APP_VITE_DEV"), e.getMessage());
    }

    @Test
    void flagParsesTrueAndFalse() {
        assertTrue(AppConfig.of(Map.of("APP_VITE_DEV", "true")).viteDev());
        assertFalse(AppConfig.of(Map.of("APP_VITE_DEV", "false")).viteDev());
    }

    @Test
    void viteDevOriginDropsTrailingSlash() {
        AppConfig config = AppConfig.of(Map.of("APP_VITE_DEV_ORIGIN", "http://localhost:5173/"));
        assertEquals("http://localhost:5173", config.viteDevOrigin());
    }

    @Test
    void viteDevOriginIsRequiredWhenAsked() {
        assertThrows(IllegalStateException.class, () -> AppConfig.of(Map.of()).viteDevOrigin());
    }

    @ParameterizedTest
    @ValueSource(strings = {"localhost:5173", "ftp://x", "http://a/b", "http://x'+alert(1)+'", "http://x\"><b>"})
    void viteDevOriginMustBeAPlainOrigin(String value) {
        AppConfig config = AppConfig.of(Map.of("APP_VITE_DEV_ORIGIN", value));
        assertThrows(IllegalStateException.class, config::viteDevOrigin);
    }

    @Test
    void sharedInstanceReadsTheProcessEnvironment() {
        assertSameValue(System.getenv("PATH"), AppConfig.get().optional("PATH", null));
    }

    private static void assertSameValue(String env, String read) {
        assertEquals(env == null || env.isBlank() ? null : env.strip(), read);
    }
}
