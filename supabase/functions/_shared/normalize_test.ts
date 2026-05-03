import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  clampHeadlineForSlug,
  ensureAndamanReference,
  includesAndamanKeyword,
  slugify,
  smartTruncate,
} from "./normalize.ts";

Deno.test("smartTruncate keeps short text untouched", () => {
  assertEquals(smartTruncate("hello world", 50), "hello world");
});

Deno.test("smartTruncate truncates at word boundary with ellipsis", () => {
  const out = smartTruncate("the quick brown fox jumps over the lazy dog", 20);
  assert(out.length <= 20, `length ${out.length}`);
  assert(out.endsWith("…"));
  assert(!out.includes("  "));
});

Deno.test("smartTruncate collapses whitespace", () => {
  assertEquals(smartTruncate("  hello   world  ", 50), "hello world");
});

Deno.test("smartTruncate hard-cuts when no good word boundary", () => {
  const out = smartTruncate("supercalifragilisticexpialidocious", 10);
  assertEquals(out.length, 10);
  assert(out.endsWith("…"));
});

Deno.test("includesAndamanKeyword is case-insensitive", () => {
  assert(includesAndamanKeyword("A trip to Havelock today"));
  assert(includesAndamanKeyword("PORT BLAIR ferry"));
  assert(!includesAndamanKeyword("Goa beach guide"));
});

Deno.test("ensureAndamanReference appends suffix when missing", () => {
  const out = ensureAndamanReference("A diver explores a coral reef", 125);
  assert(includesAndamanKeyword(out));
  assert(out.length <= 125);
});

Deno.test("ensureAndamanReference no-op when keyword present", () => {
  const input = "Sunset over Radhanagar beach in Havelock";
  assertEquals(ensureAndamanReference(input, 125), input);
});

Deno.test("ensureAndamanReference fits within max by truncating body", () => {
  const long = "a".repeat(200);
  const out = ensureAndamanReference(long, 125);
  assert(out.length <= 125, `length ${out.length}`);
  assert(includesAndamanKeyword(out));
});

Deno.test("slugify produces url-safe lowercase", () => {
  assertEquals(slugify("Hello, World! 2026"), "hello-world-2026");
});

Deno.test("clampHeadlineForSlug shortens until slug fits", () => {
  const headline = "An Incredibly Long Story About Diving In Havelock Beach Andaman 2026";
  const out = clampHeadlineForSlug(headline, 40);
  assert(slugify(out).length <= 40, `slug ${slugify(out)}`);
});
