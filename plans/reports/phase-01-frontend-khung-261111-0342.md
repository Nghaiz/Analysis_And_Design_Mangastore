# Phase 1, lane 1B `frontend-khung`: báo cáo

Ngày: 11/11/2026. Nhánh `lane/01-khung/frontend-khung`, worktree `D:/Coding/mangastore-wt/01-frontend-khung`.
Commit code: `78bd09d172f6d441090600af32515fa05dd01c48`.

**Status:** DONE_WITH_CONCERNS (code xanh; các mục "lưu ý cho lane khác" bên dưới cần orchestrator và lane 1A đọc).

## 1. File đã tạo (tất cả trong `frontend/`, không đụng `package.json`, `package-lock.json`)

| File | Nội dung |
|---|---|
| `vite.config.ts` | `root` = `frontend/`, `base: '/static/'`, plugin `react()` + `tailwindcss()`, alias `@` → `./src`, top-level `input: ['src/loader/island-loader.ts', 'src/styles/app.css']`, `build.outDir: '../src/main/webapp/static'`, `emptyOutDir: true`, `manifest: true`; dev server cổng 5173 `strictPort`, `server.origin: 'http://localhost:5173'`, `server.cors.origin: 'http://localhost:8080'`; `test` (Vitest): `environment: 'jsdom'`, `include: ['src/**/*.test.{ts,tsx}']`, `restoreMocks: true` |
| `tsconfig.json` | solution file: tham chiếu `tsconfig.app.json` + `tsconfig.node.json`, có `paths` `@/*` (shadcn đọc file này) |
| `tsconfig.app.json` | `src/`, ES2023 + DOM, `moduleResolution: bundler`, `jsx: react-jsx`, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `types: ["vite/client"]`, `paths` `@/*` |
| `tsconfig.node.json` | chỉ `vite.config.ts`, `types: ["node"]` |
| `eslint.config.js` | flat config (`eslint/config` `defineConfig`): `@eslint/js` recommended, `typescript-eslint` recommended, `react-hooks` `configs.flat.recommended`, `react-refresh` `configs.vite`; `globalIgnores(['dist', 'coverage'])` |
| `components.json` | shadcn: `style: new-york`, `tsx`, `rsc: false`, Tailwind v4 (`config: ""`, `css: src/styles/app.css`, `baseColor: neutral`, `cssVariables`), `iconLibrary: lucide`, alias `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`. Chưa thêm component |
| `src/lib/utils.ts` | `cn(...inputs)` = `twMerge(clsx(inputs))` |
| `src/styles/app.css` | `@import "tailwindcss";` + `@source "../../../src/main/webapp/**/*.{jsp,tag}";` |
| `src/loader/island-loader.ts` | entry Vite: `import 'vite/modulepreload-polyfill'`, dựng registry từ `import.meta.glob<IslandModule>('../islands/*/index.tsx')`, gọi `mountIslands({ registry })` |
| `src/loader/mount-islands.ts` | logic loader (tách khỏi entry để test không kéo theo side effect của entry) |
| `src/loader/island-loader.test.ts` | 14 test Vitest (jsdom) |

`components.json` và `src/lib/utils.ts` viết tay; không chạy `shadcn init`. Đã kiểm bằng `npx --no-install shadcn info` (chỉ đọc): shadcn nhận Vite, Tailwind v4, `src/styles/app.css`, alias `@`, style `new-york`, base `radix`.

## 2. Lệnh và kết quả

| Lệnh | Kết quả |
|---|---|
| `npm ci` (trong `frontend/`) | OK, lockfile không đổi. `npm audit` báo: `deepmerge` (qua `shadcn` → `@shadcn/registry`) và `minimatch` (qua `eslint` 10 → `@eslint/config-array`), đều là devDependency, không vào bundle. Không chạy `audit fix` (sẽ hạ `shadcn` về 1.0.0 và `eslint` về 9) |
| `npm --prefix frontend run typecheck` (`tsc -b`) | exit 0 |
| `npm --prefix frontend run lint` | exit 0, không cảnh báo |
| `npm --prefix frontend run test` | exit 0, `Tests 14 passed (14)` |
| `npm --prefix frontend run build` | exit 0, Vite 8.3.7, 14 module |
| Làm đỏ có chủ đích | thêm `import 'react-dom/client'` tĩnh vào entry → test "boots on a page without islands and does not import React" FAIL (`expected "vi.fn()" to not be called at all, but actually been called 1 times`); bỏ dòng đó → xanh lại |
| Dev server `npx vite` + `curl -I -H "Origin: http://localhost:8080" http://localhost:5173/static/src/loader/island-loader.ts` | `200`, `Access-Control-Allow-Origin: http://localhost:8080`, `Content-Type: text/javascript`. Đã tắt server sau khi kiểm |
| `git check-ignore -v src/main/webapp/static/.vite/manifest.json` | khớp `.gitignore:12:src/main/webapp/static/`; đầu ra build không vào commit |

Kích thước build:

```
../src/main/webapp/static/.vite/manifest.json                 0.88 kB │ gzip:  0.28 kB
../src/main/webapp/static/assets/app-NTGTz7Ol.css             4.47 kB │ gzip:  1.47 kB
../src/main/webapp/static/assets/island-loader-DC99wicD.js    5.35 kB │ gzip:  2.46 kB
../src/main/webapp/static/assets/react-C09vBOoi.js            7.87 kB │ gzip:  3.00 kB
../src/main/webapp/static/assets/client-BwoADOad.js         211.12 kB │ gzip: 65.87 kB
```

React và react-dom chỉ nằm trong `dynamicImports` của entry, nên trang không có island chỉ tải `island-loader-*.js` (2,46 kB gzip).

### Manifest sinh ra (`src/main/webapp/static/.vite/manifest.json`)

```json
{
  "_react-C09vBOoi.js": {
    "file": "assets/react-C09vBOoi.js",
    "name": "react",
    "imports": [
      "src/loader/island-loader.ts"
    ]
  },
  "node_modules/react-dom/client.js": {
    "file": "assets/client-BwoADOad.js",
    "name": "client",
    "src": "node_modules/react-dom/client.js",
    "isDynamicEntry": true,
    "imports": [
      "src/loader/island-loader.ts",
      "_react-C09vBOoi.js"
    ]
  },
  "src/loader/island-loader.ts": {
    "file": "assets/island-loader-DC99wicD.js",
    "name": "island-loader",
    "src": "src/loader/island-loader.ts",
    "isEntry": true,
    "dynamicImports": [
      "_react-C09vBOoi.js",
      "node_modules/react-dom/client.js"
    ]
  },
  "src/styles/app.css": {
    "file": "assets/app-NTGTz7Ol.css",
    "name": "app",
    "names": [
      "app.css"
    ],
    "src": "src/styles/app.css",
    "isEntry": true
  }
}
```

Cả hai khoá `src/loader/island-loader.ts` và `src/styles/app.css` có `isEntry: true` (tiêu chí hoàn thành 2 của phase 1).

## 3. Gotcha đã gặp hoặc đã tra

1. **Vite 8: `build.rollupOptions` đã deprecated**, là alias của `build.rolldownOptions` (context7 `/vitejs/vite/v8.3.5`, `docs/guide/migration.md`). Tài liệu khuyên dùng **top-level `input`** (shared option, mới ở Vite 8): nó là giá trị mặc định cho `build.rolldownOptions.input` và cho `optimizeDeps.entries` ở dev. Config dùng `input`. Báo cáo researcher §5 còn ghi `build.rollupOptions.input`; cách đó vẫn chạy nhưng là API cũ.
2. **TypeScript 6.0 deprecate `baseUrl`** và đổi mặc định `types` thành `[]` (context7, release notes TS 6.0). Các bước shadcn trong researcher §3 bảo thêm `baseUrl`; ở TS 6 thì bỏ `baseUrl`, viết `paths: { "@/*": ["./src/*"] }` (đường dẫn tính từ file tsconfig) và khai rõ `types` (`vite/client` cho app, `node` cho config).
3. **Entry không phải HTML cần tự import `vite/modulepreload-polyfill`** (tài liệu `build.modulePreload`). Đã import ở dòng đầu entry. Polyfill dùng `fetch` cùng origin, không vướng CSP `script-src 'self'` của phase 1.
4. **Dev server phục vụ dưới `base`**: URL dev là `http://localhost:5173/static/@vite/client` và `http://localhost:5173/static/src/loader/island-loader.ts` (có `/static/`). Xem mục 5, lưu ý cho lane 1A.
5. **Chunk dùng chung có thể `imports` ngược về entry**: trong manifest, `_react-*.js` và `node_modules/react-dom/client.js` đều có `imports: ["src/loader/island-loader.ts"]` (rolldown đặt helper preload trong chunk entry). Bộ duyệt đệ quy của `util/ViteManifest` phải chống lặp (contract §10 đã nói "không lặp"), nếu không sẽ vòng vô hạn khi duyệt từ chunk động.
6. **Tailwind v4 chỉ tự quét thư mục của Vite root (`frontend/`)**. Class Tailwind viết trong JSP sẽ không được sinh nếu không khai báo. `app.css` đã có `@source "../../../src/main/webapp/**/*.{jsp,tag}"`, giới hạn ở `.jsp`/`.tag` nên không quét chính đầu ra `static/`.
7. **`createRoot(el).render(...)` thay toàn bộ con của `el`.** HTML dự phòng do JSP render bên trong `<div data-island>` sẽ bị thay khi island mount. Đó là điều mong muốn (island thay bản HTML), nhưng nếu component ném lỗi khi render, React gỡ root và phần dự phòng cũng mất. Phase 6 nên đặt Error Boundary trong từng island, hoặc để phần form dự phòng ngoài `div` island.
8. Lệnh `rm` trên đường dẫn tương đối kiểu `../../x.bak` từ Git Bash bị bộ kiểm an toàn chặn (đường dẫn tách thành `d:\...`). Không ảnh hưởng repo; ghi lại để lần sau dùng Edit thay cho file tạm.

## 4. API island loader (cho phase 5, 6, 7, 8)

Markup do JSP sinh (contract §5):

```html
<form method="post" action="doXxx.jsp">
  <div data-island="SelectedStack" data-props="selected-stack-props"></div>
  <script type="application/json" id="selected-stack-props">{"books":[...]}</script>
</form>
```

Thêm một island: tạo `frontend/src/islands/<Tên>/index.tsx` với `export default function <Tên>(props: IslandProps) {...}`. Registry tự có (glob `../islands/*/index.tsx`), tên island là tên thư mục, không sửa `vite.config.ts`. Mỗi island thành một chunk động.

`src/loader/mount-islands.ts` xuất:

| Tên | Kiểu | Ghi chú |
|---|---|---|
| `IslandProps` | `Record<string, unknown>` | props là object JSON; island tự thu hẹp kiểu |
| `IslandModule` | `{ default: ComponentType<IslandProps> }` | hình dạng của `islands/<Tên>/index.tsx` |
| `IslandLoader` | `() => Promise<IslandModule>` | |
| `IslandRegistry` | `ReadonlyMap<string, IslandLoader>` | khoá là tên island |
| `ReactRuntime` | `{ createElement, createRoot }` | tiêm được để test |
| `registryFromGlob(modules)` | `Record<path, IslandLoader>` → `IslandRegistry` | đường dẫn không đúng `.../islands/<Tên>/index.tsx` thì ném lỗi |
| `loadReactRuntime()` | `Promise<ReactRuntime>` | `import('react')` + `import('react-dom/client')` |
| `mountIslands(options)` | `Promise<MountReport>` | xem dưới |
| `ISLAND_ATTRIBUTE`, `PROPS_ATTRIBUTE` | `'data-island'`, `'data-props'` | |

`MountOptions`: `registry` (bắt buộc), `root?: ParentNode` (mặc định `document`), `loadRuntime?` (mặc định `loadReactRuntime`), `reportError?: (message, cause?) => void` (mặc định `console.error`).
`MountReport`: `{ mounted: string[]; failed: { name; element; message }[] }`.

Hành vi:
- Không có `[data-island]` → trả ngay, không import React, không gọi chunk nào.
- Kiểm đồng bộ từng island trước khi tải gì: tên rỗng; tên không có trong registry (thông báo liệt kê tên đã biết và đường dẫn file cần tạo); `data-props` trỏ tới phần tử không phải `<script type="application/json">`; JSON hỏng; JSON không phải object. Mỗi lỗi → một dòng `console.error` có tiền tố `[island-loader]` và tên island, island khác vẫn chạy.
- Không có `data-props` → props `{}` (dùng cho island không cần dữ liệu, ví dụ `ShelfScene`).
- React chỉ được import khi còn ít nhất một island qua bước kiểm. Chunk island và React tải song song.
- Chunk island tải hỏng, thiếu default export, hoặc `createRoot` ném lỗi → `Island "<Tên>" failed to mount.` kèm nguyên nhân; island khác không bị ảnh hưởng.
- Lỗi render bên trong component (sau khi mount) do React xử lý (mặc định `console.error`), loader không bắt.

Test hiện có (14): không island → không import gì; mount đúng container với props JSON (có chữ tiếng Việt); JSON hỏng + tên lạ báo lỗi, island lành vẫn mount; mọi island hỏng → không tải React; 4 trường hợp props/tên sai; thiếu `data-props` → `{}`; chunk tải hỏng không chặn island khác; render React thật qua runtime mặc định; `registryFromGlob` đặt khoá theo tên thư mục và từ chối đường dẫn sai; entry thật chạy trên trang không có island mà không import `react-dom/client` và không `console.error`.

## 5. Lưu ý cho lane khác

- **Lane 1A (`assets.tag`, `ViteManifest`)**: khi `APP_VITE_DEV=true`, đường dẫn dev phải có `base`: `${APP_VITE_DEV_ORIGIN}/static/@vite/client`, preamble React refresh import từ `${APP_VITE_DEV_ORIGIN}/static/@react-refresh`, entry là `${APP_VITE_DEV_ORIGIN}/static/src/loader/island-loader.ts` và `${APP_VITE_DEV_ORIGIN}/static/src/styles/app.css`. Ở bản build, entry CSS là một khoá riêng (`src/styles/app.css` có `file`, không có `css`), nên tag phải in `<link rel="stylesheet">` cho chính `file` của entry CSS, không chỉ cho mảng `css` của entry JS. Bộ duyệt `imports` phải chống lặp (gotcha 5).
- **Preamble React refresh ở dev là script inline**: CSP phase 1 (`script-src 'self'`) chặn nó, nhưng contract §10 đã ghi trang dev Vite không đi qua nginx, nên chỉ cần nhớ khi ai đó thử dev mode qua cổng 8080 của nginx (`127.0.0.1:8080` là nginx theo contract §3). Nếu dev mode cần chạy qua nginx, CORS hiện tại đã đúng origin `http://localhost:8080`, còn CSP thì không.
- **Origin**: CORS chỉ cho `http://localhost:8080`. Mở trang bằng `http://127.0.0.1:8080` ở dev mode sẽ bị chặn CORS (origin khác chuỗi). Nếu cần, thêm `http://127.0.0.1:8080` vào `server.cors.origin` (mảng).

## 6. Đề xuất (orchestrator quyết)

1. **Dependency cho phase 5** (không cài ở lane này): `lucide-react` (vì `components.json` khai `iconLibrary: lucide`, component shadcn import nó) và `radix-ui` (primitive cho style `new-york`, base `radix`). Thêm bằng orchestrator, ghim bản chính xác như các gói khác.
2. **`npm audit`**: hai cảnh báo moderate chỉ ở devDependency (`shadcn` → `deepmerge`, `eslint` 10 → `minimatch`). Không sửa bằng `--force` vì sẽ hạ major. Theo dõi bản vá upstream; có thể thêm `overrides` trong `package.json` nếu bản vá của `deepmerge`/`minimatch` ra mà gói cha chưa nâng.
3. **`typescript-eslint` 8.72.2 + TypeScript 6.0.3**: lint chạy không cảnh báo phiên bản TS trong lần này; nếu nâng TS lên 6.1 cần kiểm lại dải peer.
4. Phase 6: cân nhắc cho `createRoot` tham số `onUncaughtError` để log có tên island, và một thuộc tính trạng thái (`data-island-state="mounted|failed"`) để E2E phase 8 chờ island mount thay vì chờ theo thời gian. Chưa làm ở phase 1 (YAGNI).

**Status:** DONE_WITH_CONCERNS
**Summary:** Khung frontend (Vite 8, TS 6, ESLint flat, shadcn, Tailwind v4, island loader + 14 test) xong; lint, test, build xanh; manifest có đủ hai entry `isEntry: true`.
**Concerns/Blockers:** không chặn; lane 1A cần đọc mục 5 (đường dẫn dev có `/static/`, entry CSS là khoá riêng, chống lặp khi duyệt `imports`); đề xuất dependency ở mục 6.
