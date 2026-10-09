import { describe, expect, it } from "vitest";
import { buildRosterLink, planRosterMerge, readSharedRoster } from "../rosterShare";

const hashOf = (link: string) => link.slice(link.indexOf("#"));

describe("roster share link", () => {
  it("round-trips names (with accents) and positions", () => {
    const link = buildRosterLink(
      "Rink A",
      [
        { name: "Zoë Park", positions: ["Skip", "Vice"] },
        { name: "  ", positions: [] },
        { name: "Ike Ono", positions: [] },
      ],
      "https://x.app/",
    );
    expect(link.startsWith("https://x.app/#roster=")).toBe(true);
    expect(readSharedRoster(hashOf(link))).toEqual({
      team: "Rink A",
      players: [
        { name: "Zoë Park", positions: ["Skip", "Vice"] },
        { name: "Ike Ono", positions: [] },
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
    const h = "#roster=" + btoa(JSON.stringify({ v: 1, s: "curling", p: [["Bo", "", "Lead/Goalie"]] }));
    expect(readSharedRoster(h)).toEqual({ team: "", players: [{ name: "Bo", positions: ["Lead"] }] });
  });

  it("skips players already on the roster by name", () => {
    const { toAdd, skipped } = planRosterMerge(
      [{ name: "zoë park " }],
      [{ name: "Zoë Park", positions: [] }, { name: "Ike Ono", positions: [] }, { name: "Ike Ono", positions: [] }],
    );
    expect(toAdd.map((p) => p.name)).toEqual(["Ike Ono"]);
    expect(skipped).toBe(2);
  });
});
