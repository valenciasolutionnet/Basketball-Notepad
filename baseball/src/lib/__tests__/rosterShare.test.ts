import { describe, expect, it } from "vitest";
import { buildRosterLink, planRosterMerge, readSharedRoster } from "../rosterShare";

const hashOf = (link: string) => link.slice(link.indexOf("#"));

describe("roster share link", () => {
  it("round-trips names (with accents), numbers and positions", () => {
    const link = buildRosterLink(
      "Tigers",
      [
        { name: "José Peña", number: "9", positions: ["SS", "2B"] },
        { name: "  ", number: "1", positions: [] },
        { name: "Ike Ono", number: "", positions: [] },
      ],
      "https://x.app/",
    );
    expect(link.startsWith("https://x.app/#roster=")).toBe(true);
    expect(readSharedRoster(hashOf(link))).toEqual({
      team: "Tigers",
      players: [
        { name: "José Peña", number: "9", positions: ["SS", "2B"] },
        { name: "Ike Ono", number: "", positions: [] },
      ],
    });
  });

  it("ignores other fragments, rejects damaged links and other sports", () => {
    expect(readSharedRoster("#plan")).toBeNull();
    expect(readSharedRoster("#roster=@@@")).toHaveProperty("error");
    const vb = "#roster=" + btoa(JSON.stringify({ v: 1, s: "volleyball", p: [["Ana", "9", "OH"]] }));
    expect(readSharedRoster(vb)).toEqual({ error: "This roster link is for the Volleyball Notepad. Open it there instead." });
  });

  it("drops positions this app doesn't know", () => {
    const h = "#roster=" + btoa(JSON.stringify({ v: 1, s: "baseball", p: [["Bo", "4", "SS/Goalie"]] }));
    expect(readSharedRoster(h)).toEqual({ team: "", players: [{ name: "Bo", number: "4", positions: ["SS"] }] });
  });

  it("skips players already on the roster (same name and number)", () => {
    const { toAdd, skipped } = planRosterMerge(
      [{ name: "josé peña ", number: "9" }],
      [
        { name: "José Peña", number: "9", positions: [] },
        { name: "José Peña", number: "12", positions: [] },
        { name: "Ike Ono", number: "", positions: [] },
        { name: "Ike Ono", number: "", positions: [] },
      ],
    );
    expect(toAdd.map((p) => `${p.name}#${p.number}`)).toEqual(["José Peña#12", "Ike Ono#"]);
    expect(skipped).toBe(2);
  });
});
