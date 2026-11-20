import { assertEquals } from "@std/assert";
import { Average } from "../src/average.ts";
import { FileAccess } from "../src/file_access.ts";
import { NumberSource } from "../src/number_source.ts";

class Fake implements NumberSource {
  files = new Map<string, number[]>();
  constructor(private path: string) {}
  add(path: string, numbers: number[]) { this.files.set(path, numbers); }
  readNumbers = () => Promise.resolve(this.files.get(this.path)!);
}

class HardcodedStub implements NumberSource {
  readNumbers = () => Promise.resolve([1, 2, 3, 4, 5]);
}

class ConfigurableStub implements NumberSource {
  constructor(private numbers: number[]) {}
  readNumbers = () => Promise.resolve(this.numbers);
}

class Mock implements NumberSource {
  calls = 0;
  readNumbers() { this.calls++; return Promise.resolve([1, 2, 3, 4, 5]); }
}

class Spy implements NumberSource {
  calls = 0;
  results: number[][] = [];
  constructor(private real: FileAccess) {}
  async readNumbers() {
    this.calls++;
    const r = await this.real.readNumbers();
    this.results.push(r);
    return r;
  }
}

Deno.test("Fake", async () => {
  const fake = new Fake("/some/file");
  fake.add("/empty", []);
  fake.add("/some/file", [1, 2, 3, 4, 5]);
  assertEquals(await new Average(fake).computeMeanOfFile(), 3);
});

Deno.test("Stub hardcoded", async () => {
  assertEquals(await new Average(new HardcodedStub()).computeMeanOfFile(), 3);
});

Deno.test("Stub configurable", async () => {
  const stub = new ConfigurableStub([1, 2, 3, 4, 5]);
  assertEquals(await new Average(stub).computeMeanOfFile(), 3);
});

Deno.test("Mock", async () => {
  const mock = new Mock();
  assertEquals(await new Average(mock).computeMeanOfFile(), 3);
  assertEquals(mock.calls, 1);
});

Deno.test("Spy", async () => {
  const path = await Deno.makeTempFile();
  await Deno.writeTextFile(path, "10\n20\n30\n");
  const spy = new Spy(new FileAccess(path));
  assertEquals(await new Average(spy).computeMeanOfFile(), 20);
  assertEquals(spy.calls, 1);
  assertEquals(spy.results, [[10, 20, 30]]);
  await Deno.remove(path);
});
