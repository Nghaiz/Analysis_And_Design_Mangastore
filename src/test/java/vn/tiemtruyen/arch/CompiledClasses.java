package vn.tiemtruyen.arch;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.lang.classfile.Attributes;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import vn.tiemtruyen.dao.DAO;

/**
 * Mọi lớp main đã biên dịch (thư mục chứa {@link DAO}.class, tức {@code target/classes}), đọc bằng
 * {@code java.lang.classfile} của JDK: không nạp lớp, không cần thư viện quét.
 */
final class CompiledClasses {

    private CompiledClasses() {
    }

    /**
     * Một lớp đã biên dịch.
     *
     * @param model mô hình file .class
     * @param path file .class
     */
    record CompiledClass(ClassModel model, Path path) {

        /** Tên nội bộ, ví dụ {@code vn/tiemtruyen/dao/BookDAO} hoặc {@code vn/tiemtruyen/dao/CartDAO$1}. */
        String internalName() {
            return model.thisClass().asInternalName();
        }

        /** Tên gói dạng chấm. */
        String packageName() {
            String name = internalName();
            int slash = name.lastIndexOf('/');
            return slash < 0 ? "" : name.substring(0, slash).replace('/', '.');
        }

        /** Tên ngắn sau gói và sau {@code $} cuối (lớp lồng). */
        String simpleName() {
            String name = internalName();
            return name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('$')) + 1);
        }

        /** Lớp lồng, cục bộ hoặc ẩn danh: trình biên dịch ghi thuộc tính {@code NestHost}. */
        boolean nested() {
            return model.findAttribute(Attributes.nestHost()).isPresent();
        }
    }

    /** Thư mục gốc của lớp main ({@code target/classes}). */
    static Path root() {
        try {
            return Path.of(DAO.class.getProtectionDomain().getCodeSource().getLocation().toURI());
        } catch (URISyntaxException e) {
            throw new IllegalStateException("Không định vị được thư mục lớp main", e);
        }
    }

    /** Mọi file .class dưới {@link #root()}. */
    static List<CompiledClass> all() {
        Path root = root();
        if (!Files.isRegularFile(root.resolve("vn/tiemtruyen/dao/DAO.class"))) {
            throw new IllegalStateException(root + " không phải thư mục lớp main (thiếu vn/tiemtruyen/dao/DAO.class)");
        }
        try (Stream<Path> files = Files.walk(root)) {
            return files.filter(p -> p.toString().endsWith(".class"))
                    .filter(p -> !p.getFileName().toString().equals("module-info.class"))
                    .map(CompiledClasses::read)
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("Không duyệt được " + root, e);
        }
    }

    private static CompiledClass read(Path path) {
        try {
            return new CompiledClass(ClassFile.of().parse(Files.readAllBytes(path)), path);
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được " + path, e);
        }
    }
}
