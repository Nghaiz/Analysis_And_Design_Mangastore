package vn.tiemtruyen.arch;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.http.HttpServlet;
import java.lang.classfile.ClassModel;
import java.lang.classfile.MethodModel;
import java.lang.classfile.constantpool.PoolEntry;
import java.lang.classfile.constantpool.Utf8Entry;
import java.lang.invoke.MethodType;
import java.lang.reflect.AccessFlag;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import vn.tiemtruyen.arch.CompiledClasses.CompiledClass;

/**
 * Luật DAO của thầy (contracts §5.1, §5.3) và luật kiến trúc, kiểm trên lớp main đã biên dịch.
 *
 * <p>Danh sách hàm cho phép đọc từ bảng §5.3 lúc chạy; test chỉ giữ hai danh sách tên của §5.1 (chín lớp DAO, bốn
 * lớp trung gian) và đòi §5.3 khớp danh sách chín lớp.
 */
class ArchitectureTest {

    private static final String DAO_PACKAGE = "vn.tiemtruyen.dao";
    private static final Set<String> DAO_CLASSES = Set.of("DAO", "UserDAO", "ClientDAO", "StaffDAO", "BookDAO",
            "CartDAO", "RentalBillDAO", "DamageDAO", "CollateralDAO");
    private static final Set<String> INTERMEDIATE = Set.of("SelectedBook", "RentedBook", "RentedDamage",
            "RentalCollateral");
    private static final Pattern READ_BY_ID = Pattern.compile("(get|find).*ById");
    private static final String CLOSE = "close()V";
    private static final String UPDATE_PREFIX = "update";
    private static final List<String> SPRING = List.of("org/springframework", "org.springframework");
    private static final Set<String> OBJECT_METHODS = Arrays.stream(Object.class.getMethods())
            .map(ArchitectureTest::signature).collect(Collectors.toUnmodifiableSet());

    private static List<CompiledClass> classes;

    @BeforeAll
    static void scan() {
        classes = CompiledClasses.all();
    }

    @Test
    void contractTableListsExactlyTheNineDaoClasses() {
        assertEquals(new TreeSet<>(DAO_CLASSES), new TreeSet<>(DaoContract.read().keySet()),
                "Cột Lớp của contracts " + DaoContract.HEADING + " phải đúng chín lớp DAO của §5.1");
    }

    @Test
    void daoPackageHasExactlyTheNineDaoClasses() {
        Set<String> compiled = classes.stream().filter(c -> DAO_PACKAGE.equals(c.packageName()) && !c.nested())
                .map(CompiledClass::simpleName).collect(Collectors.toCollection(TreeSet::new));
        assertEquals(new TreeSet<>(DAO_CLASSES), compiled, "Gói " + DAO_PACKAGE + " (không tính lớp lồng/ẩn danh)");
    }

    @Test
    void daoHierarchyFollowsContract() {
        Map<String, ClassModel> daos = daos();
        DaoContract.read().forEach((name, spec) -> {
            ClassModel model = daos.get(name);
            if (model == null) {
                return;
            }
            String expected = spec.superName() == null ? "java/lang/Object" : "vn/tiemtruyen/dao/" + spec.superName();
            assertEquals(expected, model.superclass().orElseThrow().asInternalName(), name + ": lớp cha theo §5.3");
        });
        ClassModel base = daos.get("DAO");
        assertTrue(base != null && base.interfaces().stream()
                .anyMatch(i -> "java/lang/AutoCloseable".equals(i.asInternalName())), "DAO implements AutoCloseable");
    }

    @Test
    void noDaoOutsideTheNineAndNoneForIntermediateClasses() {
        List<String> violations = new ArrayList<>();
        for (CompiledClass c : classes) {
            boolean daoNamed = c.simpleName().endsWith("DAO");
            boolean allowed = !c.nested() && DAO_PACKAGE.equals(c.packageName())
                    && DAO_CLASSES.contains(c.simpleName());
            if (daoNamed && !allowed) {
                violations.add(c.internalName());
            }
        }
        for (String intermediate : INTERMEDIATE) {
            assertTrue(Files.isRegularFile(CompiledClasses.root().resolve("vn/tiemtruyen/model/" + intermediate
                    + ".class")), intermediate + " phải là lớp model (danh sách lớp trung gian của §5.1)");
            assertTrue(!DaoContract.read().containsKey(intermediate + "DAO"), "§5.3 không được có " + intermediate
                    + "DAO");
        }
        assertEquals(List.of(), violations, "Lớp tên *DAO ngoài chín lớp của §5.1 (lớp trung gian không có DAO: "
                + INTERMEDIATE + ")");
    }

    @Test
    void noMethodReadsById() {
        List<String> violations = new ArrayList<>();
        for (CompiledClass c : classes) {
            for (MethodModel method : c.model().methods()) {
                if (READ_BY_ID.matcher(method.methodName().stringValue()).matches()) {
                    violations.add(c.internalName() + "." + method.methodName().stringValue());
                }
            }
        }
        assertEquals(List.of(), violations, "Cấm hàm đọc theo id (get*ById, find*ById), contracts §5.1");
    }

    @Test
    void daoPublicMethodsAreListedInContract() {
        Map<String, ClassModel> daos = daos();
        List<String> violations = new ArrayList<>();
        DaoContract.read().forEach((name, spec) -> {
            ClassModel model = daos.get(name);
            if (model == null) {
                return;
            }
            Set<String> allowed = new TreeSet<>(Set.of(CLOSE));
            spec.methods().forEach(m -> allowed.add(m.name() + m.descriptor()));
            for (MethodModel method : publicDeclared(model)) {
                if (!allowed.contains(signature(method))) {
                    violations.add(name + "." + signature(method) + " (cho phép: " + allowed + ")");
                }
            }
        });
        assertEquals(List.of(), violations, "Hàm public của DAO ngoài contracts " + DaoContract.HEADING);
    }

    @Test
    void everyContractMethodIsDeclared() {
        Map<String, ClassModel> daos = daos();
        List<String> missing = new ArrayList<>();
        DaoContract.read().forEach((name, spec) -> {
            ClassModel model = daos.get(name);
            Set<String> declared = model == null ? Set.of() : publicDeclared(model).stream()
                    .map(ArchitectureTest::signature).collect(Collectors.toSet());
            spec.methods().stream().filter(m -> !declared.contains(m.name() + m.descriptor()))
                    .forEach(m -> missing.add(name + "." + m.uml() + (model == null ? " (chưa có lớp)" : "")));
        });
        assertEquals(List.of(), missing, "Hàm của contracts " + DaoContract.HEADING + " chưa khai báo public");
    }

    @Test
    void eachRootObjectHasOneUpdateMethod() {
        Map<String, List<String>> byRoot = new TreeMap<>();
        daos().forEach((name, model) -> {
            List<String> updates = publicDeclared(model).stream()
                    .filter(m -> m.methodName().stringValue().startsWith(UPDATE_PREFIX))
                    .map(ArchitectureTest::signature).toList();
            assertTrue(updates.size() <= 1, name + " có nhiều hàm cập nhật: " + updates);
            updates.forEach(u -> byRoot.computeIfAbsent(u.substring(u.indexOf('(')), k -> new ArrayList<>())
                    .add(name + "." + u));
        });
        byRoot.values().forEach(u -> assertEquals(1, u.size(), "Một đối tượng gốc, nhiều hàm cập nhật: " + u));
    }

    @Test
    void noClassIsAServlet() throws ClassNotFoundException {
        List<String> servlets = new ArrayList<>();
        ClassLoader loader = ArchitectureTest.class.getClassLoader();
        for (CompiledClass c : classes) {
            Class<?> type = Class.forName(c.internalName().replace('/', '.'), false, loader);
            if (HttpServlet.class.isAssignableFrom(type)) {
                servlets.add(type.getName());
            }
        }
        assertEquals(List.of(), servlets, "Không lớp nào kế thừa HttpServlet (trang JSP gọi DAO trực tiếp)");
    }

    @Test
    void noClassReferencesSpring() {
        List<String> violations = new ArrayList<>();
        for (CompiledClass c : classes) {
            for (PoolEntry entry : c.model().constantPool()) {
                if (entry instanceof Utf8Entry utf8 && SPRING.stream().anyMatch(utf8.stringValue()::contains)) {
                    violations.add(c.internalName() + ": " + utf8.stringValue());
                }
            }
        }
        assertEquals(List.of(), violations, "Lớp main tham chiếu gói org.springframework (constant pool)");
    }

    private static Map<String, ClassModel> daos() {
        return classes.stream().filter(c -> DAO_PACKAGE.equals(c.packageName()) && !c.nested())
                .collect(Collectors.toMap(CompiledClass::simpleName, CompiledClass::model, (a, b) -> a, TreeMap::new));
    }

    /** Hàm public khai báo trong lớp: bỏ constructor, hàm do trình biên dịch sinh, hàm ghi đè của Object. */
    private static List<MethodModel> publicDeclared(ClassModel model) {
        return model.methods().stream()
                .filter(m -> m.flags().has(AccessFlag.PUBLIC))
                .filter(m -> !m.flags().has(AccessFlag.SYNTHETIC) && !m.flags().has(AccessFlag.BRIDGE))
                .filter(m -> !m.methodName().stringValue().startsWith("<"))
                .filter(m -> !OBJECT_METHODS.contains(signature(m)))
                .toList();
    }

    private static String signature(MethodModel method) {
        return method.methodName().stringValue() + method.methodType().stringValue();
    }

    private static String signature(Method method) {
        return method.getName() + MethodType.methodType(method.getReturnType(), method.getParameterTypes())
                .toMethodDescriptorString();
    }
}
