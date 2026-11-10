package vn.tiemtruyen.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.Serializable;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.model.RentalBill;
import vn.tiemtruyen.model.Staff;
import vn.tiemtruyen.model.User;
import vn.tiemtruyen.support.ContractsDoc;

/** So lớp model với bảng contracts §3 (tên lớp, lớp cha, thuộc tính và kiểu) và hằng chuỗi với §4. */
class ModelContractTest {

    private static final String MODEL_PACKAGE = "vn.tiemtruyen.model";
    private static final Pattern CLASS_CELL = Pattern.compile("(\\w+)(?: extends (\\w+))?");
    private static final Pattern ATTRIBUTE = Pattern.compile("`(\\w+): ([\\w<>]+)`");
    private static final Pattern CODE_VALUE = Pattern.compile("`([^`]+)`");

    @Test
    void modelPackageHasExactlyTheThirteenDocumentedClasses() throws IOException, URISyntaxException {
        Set<String> documented = new TreeSet<>(documentedModel().keySet());
        assertEquals(13, documented.size(), "§3 phải liệt kê 13 lớp");
        Path dir = Path.of(User.class.getProtectionDomain().getCodeSource().getLocation().toURI())
                .resolve(MODEL_PACKAGE.replace('.', '/'));
        try (Stream<Path> files = Files.list(dir)) {
            Set<String> compiled = files.map(p -> p.getFileName().toString())
                    .filter(n -> n.endsWith(".class"))
                    .map(n -> n.substring(0, n.length() - ".class".length()))
                    .collect(Collectors.toCollection(TreeSet::new));
            assertEquals(documented, compiled, "Gói model chỉ có đúng 13 lớp của §3, không lớp lồng");
        }
    }

    @Test
    void everyClassMatchesDocumentedParentAndAttributes() throws ClassNotFoundException {
        for (Map.Entry<String, DocumentedClass> entry : documentedModel().entrySet()) {
            Class<?> type = Class.forName(MODEL_PACKAGE + "." + entry.getKey());
            DocumentedClass doc = entry.getValue();
            assertTrue(Serializable.class.isAssignableFrom(type), type.getSimpleName() + " phải Serializable");
            String parent = doc.parent() == null ? "Object" : doc.parent();
            assertEquals(parent, type.getSuperclass().getSimpleName(), type.getSimpleName() + ": lớp cha");
            Map<String, String> declared = new LinkedHashMap<>();
            for (Field field : type.getDeclaredFields()) {
                if (!Modifier.isStatic(field.getModifiers())) {
                    declared.put(field.getName(), typeName(field.getGenericType()));
                }
            }
            assertEquals(doc.attributes(), declared,
                    type.getSimpleName() + ": thuộc tính và kiểu đúng §3, đúng thứ tự");
        }
    }

    @Test
    void statusAndPositionConstantsMatchSectionFour() {
        Map<String, List<String>> constants = new LinkedHashMap<>();
        for (List<String> row : ContractsDoc.tableUnder("## 4. Hằng chuỗi nghiệp vụ")) {
            List<String> values = CODE_VALUE.matcher(row.get(1)).results().map(m -> m.group(1)).toList();
            constants.put(row.get(0), values);
        }
        assertEquals(List.of(RentalBill.STATUS_PENDING, RentalBill.STATUS_RENTING, RentalBill.STATUS_CANCELLED),
                constants.get("`RentalBill.status`"));
        assertEquals(List.of(Staff.POSITION_SALES, Staff.POSITION_MANAGER), constants.get("`Staff.position`"));
    }

    private static String typeName(Type type) {
        if (type instanceof ParameterizedType parameterized) {
            String args = Stream.of(parameterized.getActualTypeArguments()).map(ModelContractTest::typeName)
                    .collect(Collectors.joining(", "));
            return typeName(parameterized.getRawType()) + "<" + args + ">";
        }
        return ((Class<?>) type).getSimpleName();
    }

    private static Map<String, DocumentedClass> documentedModel() {
        Map<String, DocumentedClass> model = new LinkedHashMap<>();
        for (List<String> row : ContractsDoc.tableUnder("## 3. Lớp model (`vn.tiemtruyen.model`)")) {
            Matcher name = CLASS_CELL.matcher(row.get(0));
            assertTrue(name.matches(), "Ô lớp không đọc được: " + row.get(0));
            Map<String, String> attributes = new LinkedHashMap<>();
            ATTRIBUTE.matcher(row.get(1)).results().forEach(m -> attributes.put(m.group(1), m.group(2)));
            model.put(name.group(1), new DocumentedClass(name.group(2), attributes));
        }
        return model;
    }

    private record DocumentedClass(String parent, Map<String, String> attributes) {
    }
}
