import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual file-based hook with media events. Binary validation and
// external network checks separately verify that real audio files exist.
const manifest = JSON.parse(readFileSync(new URL("../app/data/starter-audio.json", import.meta.url), "utf8"));
const compiled = ts.transpileModule(readFileSync(new URL("../app/lib/use-starter-audio.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText;

function harness(context, overrides = {}) {
  const hookSlots = [], effects = [], positions = [];
  const timers = new Map();
  let cursor = 0, dirty = false, unmounted = false, output, media, timerId = 0, nextCalls = 0;
  let options = { lessonId: 1, lines: [{ hanzi: "你好！" }, { hanzi: "再见！" }], rate: 1, loop: false, autoplayNext: false, onNext: () => nextCalls++, onPositionChange: (index) => positions.push(index), ...overrides };
  const dependenciesChanged = (previous, next) =>
    !previous || next.length !== previous.length || next.some((value, index) => !Object.is(value, previous[index]));

  const react = {
    useRef(initial) {
      const index = cursor++;
      return hookSlots[index] ?? (hookSlots[index] = { current: initial });
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in hookSlots)) {
        hookSlots[index] = typeof initial === "function" ? initial() : initial;
      }
      return [hookSlots[index], (value) => {
        assert.equal(unmounted, false, "No state updates may occur after unmount");
        const next = typeof value === "function" ? value(hookSlots[index]) : value;
        if (!Object.is(next, hookSlots[index])) {
          hookSlots[index] = next;
          dirty = true;
        }
      }];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (dependenciesChanged(hookSlots[index]?.dependencies, dependencies)) {
        hookSlots[index] = { callback, dependencies };
      }
      return hookSlots[index].callback;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      const previous = hookSlots[index];
      if (dependenciesChanged(previous?.dependencies, dependencies)) {
        effects.push(() => {
          previous?.cleanup?.();
          hookSlots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };


  class MockAudio {
    src = "";
    playbackRate = 1;
    paused = true;
    // The harness exposes the mock media instance to drive browser events.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    constructor() { media = this; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    load() {}
    removeAttribute(name) { if (name === "src") this.src = ""; }
  }
  const mod = { exports: {} };
  vm.runInNewContext(compiled, {
    module: mod, exports: mod.exports,
    require: (name) => {
      if (name === "react") return react;
      if (name === "../data/starter-audio.json") return { default: manifest };
      throw new Error(`Unexpected import ${name}`);
    },
    Audio: MockAudio, DOMException,
    process: { env: { NEXT_PUBLIC_BASE_PATH: "/project" } },
    setTimeout: (callback) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  function render() {
    let rounds = 0;
    do {
      dirty = false; cursor = 0;
      output = mod.exports.useStarterAudio(options);
      while (effects.length) effects.shift()();
      assert.ok(++rounds < 30, "No render loop");
    } while (dirty);
    return output;
  }
  function unmount() {
    if (unmounted) return;
    unmounted = true;
    for (const slot of hookSlots) slot?.cleanup?.();
    assert.equal(timers.size, 0);
    assert.equal(media.paused, true);
  }
  context.after(unmount);
  render();
  return {
    get hook() { return render(); }, get media() { return media; },
    get nextCalls() { return nextCalls; }, positions,
    update(value) { options = { ...options, ...value }; render(); },
    expire() { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } render(); },
    unmount,
  };
}

test("starter playback uses bundled audio and waits for a real playing event", (t) => {
  const h = harness(t);
  h.hook.play();
  assert.equal(h.media.src, `/project${manifest["你好！"]}`);
  assert.equal(h.hook.isPlaying, false);
  h.media.onplaying();
  assert.equal(h.hook.isPlaying, true);
  h.media.onended();
  assert.equal(h.hook.activeLine, 1);
  assert.equal(h.media.src, `/project${manifest["再见！"]}`);
  h.media.onplaying(); h.media.onended();
  assert.equal(h.hook.isPlaying, false);
});

test("pause invalidates old media events and resumes the same sentence", (t) => {
  const h = harness(t);
  h.hook.play(); h.media.onplaying();
  const oldEnd = h.media.onended;
  h.hook.pause(); oldEnd();
  assert.equal(h.hook.activeLine, 0);
  assert.equal(h.hook.isPlaying, false);
  h.hook.play();
  assert.equal(h.media.src, `/project${manifest["你好！"]}`);
});

test("seeking clamps and saves position while vocabulary plays only once", (t) => {
  const h = harness(t, { autoplayNext: true });
  h.hook.seekLine(500);
  assert.equal(h.hook.activeLine, 1);
  assert.equal(h.media.paused, true);
  h.hook.speakText("你好！"); h.media.onplaying(); h.media.onended();
  assert.equal(h.hook.activeLine, 1);
  assert.equal(h.nextCalls, 0);
  assert.ok(h.positions.includes(1));
});

test("loop repeats the lesson and auto next runs when loop is disabled", (t) => {
  const h = harness(t, { loop: true, autoplayNext: true });
  h.hook.playLine(1); h.media.onplaying(); h.media.onended();
  assert.equal(h.hook.activeLine, 0);
  assert.equal(h.nextCalls, 0);
  h.update({ loop: false });
  h.hook.playLine(1); h.media.onplaying(); h.media.onended();
  assert.equal(h.nextCalls, 1);
});

test("loading failures surface an error and can be retried", (t) => {
  const h = harness(t);
  h.hook.play(); h.expire();
  assert.match(h.hook.error, /could not load/);
  assert.equal(h.media.paused, true);
  h.hook.play(); h.media.onplaying();
  assert.equal(h.hook.error, null);
  assert.equal(h.hook.isPlaying, true);
  h.media.onerror();
  assert.equal(h.hook.isPlaying, false);
});

test("rate changes apply to the media element; cleanup stops playback", (t) => {
  const h = harness(t, { autoplay: true });
  h.media.onplaying();
  const staleEnd = h.media.onended;
  h.update({ rate: 0.65 });
  assert.equal(h.media.playbackRate, 0.65);
  h.unmount(); staleEnd();
});
