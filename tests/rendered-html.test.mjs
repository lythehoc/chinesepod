import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const catalog = JSON.parse(await read("app/data/lessons.json"));

// Execute the same search helpers used by the app without requiring a Next loader.
const { outputText } = ts.transpileModule(await read("app/lib/lessons.ts"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const searchModule = outputText.replace(
  /import\s+lessonData\s+from\s+["']\.\.\/data\/lessons\.json["'];?/,
  `const lessonData = ${JSON.stringify(catalog)};`,
);
const { normalizeSearch, matchesLesson } = await import(
  `data:text/javascript;base64,${Buffer.from(searchModule).toString("base64")}`
);

function decodeEntities(value) {
  return value.replace(
    /&(?:amp|lt|gt|quot|apos|#39|#x[\da-f]+|#\d+);/gi,
    (entity) => {
      const named = {
        "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
        "&apos;": "'", "&#39;": "'",
      };
      if (named[entity]) return named[entity];
      const hex = entity.startsWith("&#x");
      return String.fromCodePoint(parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10));
    },
  );
}

function htmlTags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(([tag]) =>
    Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [
        key.toLowerCase(), decodeEntities(value),
      ]),
    ),
  );
}

const han = /\p{Script=Han}/u;
const tone = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i;

function assertText(value, label) {
  assert.equal(typeof value, "string", `${label} must be text`);
  assert.ok(value.trim(), `${label} must not be empty`);
}

function assertBilingual(item, label) {
  for (const key of ["hanzi", "pinyin", "vietnamese"]) assertText(item[key], `${label}.${key}`);
  assert.match(item.hanzi, han, `${label} needs Chinese characters`);
  assert.doesNotMatch(item.pinyin, han, `${label} needs a separate pinyin reading`);
  assert.match(item.pinyin, /[a-zü]/i, `${label} needs readable pinyin`);
  assert.match(item.vietnamese, /[a-z]/i, `${label} needs a Vietnamese translation`);
}

test("contains 24 complete original Mandarin lessons across all three learning levels", () => {
  assert.equal(catalog.length, 24);
  assert.equal(new Set(catalog.map(({ id }) => id)).size, catalog.length);
  assert.deepEqual(
    [...new Set(catalog.map(({ level }) => level))].sort(),
    ["Beginner", "Everyday", "Foundations"],
  );

  for (const lesson of catalog) {
    const label = `Lesson ${lesson.id}`;
    assert.ok(Number.isInteger(lesson.id) && lesson.id > 0, `${label} needs a stable positive ID`);
    for (const key of ["title", "description", "hanzi", "pinyin"]) assertText(lesson[key], `${label}.${key}`);
    assert.match(lesson.hanzi, han);
    assert.match(lesson.pinyin, tone, `${label} title should demonstrate tone-marked pinyin`);
    assert.ok(lesson.dialogue.length >= 4, `${label} needs at least four dialogue lines`);
    assert.ok(lesson.vocabulary.length >= 4, `${label} needs at least four vocabulary items`);
    assertText(lesson.note.title, `${label}.note.title`);
    assertText(lesson.note.body, `${label}.note.body`);

    for (const [index, line] of lesson.dialogue.entries()) {
      assertBilingual(line, `${label} line ${index + 1}`);
      assertText(line.speaker, `${label} line ${index + 1}.speaker`);
      assert.match(line.pinyin, tone, `${label} line ${index + 1} needs tone marks`);
    }
    for (const [index, word] of lesson.vocabulary.entries()) {
      assertBilingual(word, `${label} word ${index + 1}`);
    }
    // Neutral-tone words may legitimately have no accent; every lesson must
    // nevertheless include tone-marked vocabulary for pronunciation practice.
    assert.ok(lesson.vocabulary.some(({ pinyin }) => tone.test(pinyin)));
  }
  assert.doesNotMatch(JSON.stringify(catalog), /archive\.org|vietnamesepod|transcript_id|"mp3"/i);
});

test("search normalizes tone marks, capitalization, punctuation, and Mandarin ü input", () => {
  assert.equal(normalizeSearch("Nǐ hǎo!"), normalizeSearch("nihao"));
  assert.equal(normalizeSearch("  NI HAO  "), normalizeSearch("nǐ-hǎo"));
  for (const query of ["lǜ chá", "lücha", "lvcha", "LU:CHA"]) {
    assert.equal(normalizeSearch(query), "lvcha");
  }
  assert.notEqual(normalizeSearch("nǚ"), normalizeSearch("nu"));
  assert.equal(normalizeSearch("你好！"), "你好");
  assert.equal(normalizeSearch("Điện thoại"), normalizeSearch("dien thoai"));
});

test("search finds Chinese, pinyin, Vietnamese, vocabulary, dialogue, levels, and lesson numbers", () => {
  const lesson = {
    id: 91,
    title: "Walking home",
    hanzi: "回家",
    pinyin: "Huí jiā",
    level: "Beginner",
    description: "A short walk after class.",
    dialogue: [
      { speaker: "A", hanzi: "你好吗？", pinyin: "Nǐ hǎo ma?", vietnamese: "How are you?" },
    ],
    vocabulary: [
      { hanzi: "女孩", pinyin: "nǚhái", vietnamese: "girl" },
      { hanzi: "绿茶", pinyin: "lǜchá", vietnamese: "green tea" },
    ],
    note: { title: "Greetings", body: "Use a question to greet someone." },
  };
  for (const query of [
    "回家", "huijia", "huí jiā", "WALKING", "after class", "Beginner", "91",
    "你好", "ni hao", "nihao", "HOW ARE YOU", "女孩", "nü hai", "nvhai",
    "nǚhái", "girl", "绿茶", "lü cha", "lvcha", "lu:cha", "GREEN TEA", "",
  ]) {
    assert.equal(matchesLesson(lesson, query), true, `Should match ${JSON.stringify(query)}`);
  }
  for (const query of ["airport", "日语", "999", "nu hai", "lu cha"]) {
    assert.equal(matchesLesson(lesson, query), false, `Should not match ${JSON.stringify(query)}`);
  }
  for (const lesson of catalog) {
    assert.equal(matchesLesson(lesson, lesson.hanzi), true);
    assert.equal(matchesLesson(lesson, normalizeSearch(lesson.pinyin)), true);
    assert.equal(matchesLesson(lesson, lesson.vocabulary[0].vietnamese), true);
  }
});

test("exports the recorded podcast library with a real audio player", async () => {
  const catalog = JSON.parse(await read("app/data/podcasts.json"));
  const html = await read("out/index.html");
  const rendered = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const visibleText = decodeEntities(rendered.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  assert.match(visibleText, /Mandarin Steps/);
  assert.match(visibleText, /Podcast/);
  assert.match(visibleText, /Bài nhập môn/);
  assert.match(visibleText, /1\.920/);
  assert.match(visibleText, /Podcast do người thật thu âm/);
  assert.match(visibleText, /Mở tài liệu bài học/);
  const player = htmlTags(rendered, "audio")[0];
  assert.ok(player?.src.startsWith("https://anchor.fm/"));
  assert.ok(catalog.some((item) => item.audioUrl === player.src));
  assert.match(rendered, /<audio[^>]*controls/);
  assert.doesNotMatch(html, /vietnamesepod|Mandarin device voice|voice installation is required/i);
});

test("the catalog contains unique episodes and valid publisher audio links across five levels", async () => {
  const episodes = JSON.parse(await read("app/data/podcasts.json"));
  assert.equal(episodes.length, 1920);
  assert.equal(new Set(episodes.map((item) => item.id)).size, episodes.length);
  assert.equal(new Set(episodes.map((item) => item.level + item.title.toLowerCase())).size, episodes.length);
  assert.equal(new Set(episodes.map((item) => item.level)).size, 5);
  for (const item of episodes) {
    assert.ok(item.title.trim());
    assert.ok(item.duration >= 60);
    assert.equal(new URL(item.audioUrl).protocol, "https:");
    assert.equal(new URL(item.audioUrl).hostname, "anchor.fm");
    assert.equal(new URL(item.sourceUrl).protocol, "https:");
  }
});

test("every starter sentence and vocabulary item has a bundled AAC audio file", async () => {
  const manifest = JSON.parse(await read("app/data/starter-audio.json"));
  const paths = new Set();
  for (const lesson of catalog) {
    for (const item of [...lesson.dialogue, ...lesson.vocabulary]) {
      const path = manifest[item.hanzi];
      assert.match(path ?? "", /^\/audio\/starter\/[a-f0-9]+\.m4a$/);
      paths.add(path);
    }
  }
  assert.equal(paths.size, 288);
  for (const path of paths) {
    const bytes = await readFile(new URL(`out${path}`, root));
    assert.ok(bytes.length > 4500, `Audio must not be empty: ${path}`);
    assert.ok(bytes.includes(Buffer.from("ftyp")), `M4A container missing: ${path}`);
    assert.ok(bytes.includes(Buffer.from("mdat")), `Audio data missing: ${path}`);
  }
});

test("exports safe local icons and metadata for both local and GitHub Pages builds", async () => {
  const html = await read("out/index.html");
  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
  const basePath = process.env.GITHUB_ACTIONS === "true" && repositoryName && !repositoryName.endsWith(".github.io")
    ? `/${repositoryName}` : "";
  const links = htmlTags(html, "link");
  assert.ok(links.some((link) => link.rel === "manifest" && link.href === `${basePath}/manifest.webmanifest`));
  assert.ok(links.some((link) => link.rel === "icon" && link.href === `${basePath}/favicon.svg`));
  const manifest = JSON.parse(await read("out/manifest.webmanifest"));
  assert.equal(manifest.short_name, "Mandarin Steps");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.icons[0].src, "favicon.svg");
  assert.equal(manifest.icons[0].type, "image/svg+xml");
  assert.ok((await stat(new URL("out/favicon.svg", root))).size > 0);

  const metas = htmlTags(html, "meta");
  const meta = (name) => metas.find((item) => item.name === name || item.property === name)?.content;
  assert.match(meta("description"), /Học tiếng Trung/);
  assert.match(meta("og:title"), /Mandarin Steps/);
  assert.equal(meta("twitter:card"), "summary");
  assert.equal(meta("og:image"), undefined);
  assert.equal(meta("twitter:image"), undefined);
  assert.equal(meta("referrer"), "strict-origin-when-cross-origin");
  const csp = metas.find((item) => item["http-equiv"]?.toLowerCase() === "content-security-policy")?.content;
  assert.ok(csp, "The exported page must retain its content security policy");
  const directives = csp.split(";").map((directive) => directive.trim());
  for (const directive of ["default-src 'self'", "object-src 'none'", "form-action 'none'", "media-src 'self' https:", "connect-src 'self'"]) {
    assert.ok(directives.includes(directive), `Missing CSP directive: ${directive}`);
  }
});

test("the current app no longer references the previous audio and transcript sources", async () => {
  for (const file of ["app/page.tsx", "app/layout.tsx", "app/lib/lessons.ts"]) {
    assert.doesNotMatch(
      await read(file),
      /archive\.org|vietnamesepod|engpod|\/transcripts\/|\.mp3\b|episodes\.json|logo\.jpg|og\.png/i,
      `${file} should use the Mandarin course and local app assets`,
    );
  }
});

 test("Vietnamese locale, GitHub links and official Ori catalog are present", async () => {
  const html = await read("out/index.html");
  assert.match(html, /<html[^>]*lang="vi"/);
  for (const url of ["https://github.com/lythehoc/chinesepod", "https://github.com/lythehoc"]) {
    assert.ok(htmlTags(html, "a").some((link) => link.href === url));
  }
  const ori = JSON.parse(await read("app/data/ori.json"));
  assert.equal(ori.length, 104);
  assert.equal(new Set(ori.map((item) => item.url)).size, 104);
  for (const item of ori) assert.equal(new URL(item.url).hostname, "tv.cctv.com");
  for (const lesson of catalog) for (const item of [...lesson.dialogue, ...lesson.vocabulary]) {
    assert.ok(item.vietnamese.trim());
    assert.equal(item.english, undefined);
  }
});
