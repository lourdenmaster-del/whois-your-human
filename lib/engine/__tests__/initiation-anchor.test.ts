import { describe, it, expect } from "vitest";
import {
  parseInitiationSection,
  subjectNamePresentInInitiation,
  injectBirthAnchoringSentence,
} from "../initiation-anchor";

describe("initiation-anchor", () => {
  const reportWithInitiation = `
1. Initiation

(L) denotes the identity field. It resolves at birth.

RAW SIGNAL
- Declining solar altitude produces twilight-dominant light.
CUSTODIAN
Circadian entrainment under low flux.
ORACLE
People calibrated under fields like this often find comfort.

2. Spectral Origin

RAW SIGNAL
- Day length gates spectral input.
`;

  const reportWithName = `
1. Initiation

When Maria Alvarez was born in Denver, Colorado on 12 March 1990, the Earth rotated beneath a specific configuration.

RAW SIGNAL
- Declining solar altitude.
`;

  describe("parseInitiationSection", () => {
    it("finds section 1 INITIATION with flexible heading format", () => {
      const result = parseInitiationSection(reportWithInitiation);
      expect(result.initiationFound).toBe(true);
      expect(result.contentStart).toBeGreaterThan(0);
      expect(result.contentEnd).toBeGreaterThan(result.contentStart);
      expect(result.sectionContent).toContain("Initiation");
      expect(result.sectionContent).toContain("RAW SIGNAL");
      expect(result.section2Start).toBeGreaterThan(0);
    });

    it("returns initiationFound false when no section 1", () => {
      const result = parseInitiationSection("Some text without numbered sections.");
      expect(result.initiationFound).toBe(false);
      expect(result.contentStart).toBe(-1);
    });

    it("returns initiationFound false when section 1 is not INITIATION", () => {
      const result = parseInitiationSection(`
1. Introduction

Some content.

2. Initiation

More content.
`);
      expect(result.initiationFound).toBe(false);
    });

    it("tolerates case variations in INITIATION", () => {
      const result = parseInitiationSection(`
1. INITIATION

Content here.

2. Spectral Origin

More.
`);
      expect(result.initiationFound).toBe(true);
      expect(result.sectionContent).toContain("INITIATION");
    });

    it("accepts ## 1. INITIATION markdown-style heading", () => {
      const result = parseInitiationSection(`
## 1. INITIATION

Content here.

2. Spectral Origin

More.
`);
      expect(result.initiationFound).toBe(true);
      expect(result.contentStart).toBeGreaterThan(0);
      expect(result.sectionContent).toContain("INITIATION");
    });

    it("accepts Section 1: Initiation alternative format", () => {
      const result = parseInitiationSection(`
Section 1: Initiation

Content here.

2. Spectral Origin

More.
`);
      expect(result.initiationFound).toBe(true);
      expect(result.contentStart).toBeGreaterThan(0);
      expect(result.sectionContent).toContain("Initiation");
    });
  });

  describe("subjectNamePresentInInitiation / fullBirthAnchorPresentInInitiation", () => {
    it("returns true when full birth anchoring sentence is present", () => {
      expect(
        subjectNamePresentInInitiation(reportWithName, {
          fullName: "Maria Alvarez",
          birthDate: "12 March 1990",
          birthLocation: "Denver, Colorado",
        })
      ).toBe(true);
    });

    it("returns false when only name appears without full birth sentence", () => {
      const report = `
1. Initiation

Maria entered the world under these conditions.

2. Spectral Origin
`;
      expect(
        subjectNamePresentInInitiation(report, {
          fullName: "Maria Alvarez",
          birthDate: "12 March 1990",
          birthLocation: "Denver, Colorado",
        })
      ).toBe(false);
    });

    it("returns false when name is missing from INITIATION", () => {
      expect(
        subjectNamePresentInInitiation(reportWithInitiation, {
          fullName: "Maria Alvarez",
          birthDate: "12 March 1990",
          birthLocation: "Denver, Colorado",
        })
      ).toBe(false);
    });

    it("returns false when fullName is empty", () => {
      expect(
        subjectNamePresentInInitiation(reportWithName, {
          fullName: "",
          birthDate: "12 March 1990",
          birthLocation: "Denver, Colorado",
        })
      ).toBe(false);
    });

    it("returns false when INITIATION section not found", () => {
      expect(
        subjectNamePresentInInitiation("No sections here.", {
          fullName: "Maria Alvarez",
          birthDate: "12 March 1990",
          birthLocation: "Denver, Colorado",
        })
      ).toBe(false);
    });
  });

  describe("injectBirthAnchoringSentence", () => {
    it("injects sentence after section 1 heading when INITIATION found", () => {
      const result = injectBirthAnchoringSentence(reportWithInitiation, {
        fullName: "Jane Doe",
        birthDate: "15 January 1995",
        birthLocation: "Boston, MA",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.repairPath).toBe("section_aware");
        expect(result.report).toContain(
          "When Jane Doe was born in Boston, MA on 15 January 1995, the Earth rotated beneath a specific configuration of solar radiation, gravitational geometry, lunar illumination, and atmospheric conditions."
        );
        expect(result.report).toContain("RAW SIGNAL");
      }
    });

    it("returns ok: false when INITIATION section not found", () => {
      const result = injectBirthAnchoringSentence("No numbered sections.", {
        fullName: "Jane Doe",
        birthDate: "15 January 1995",
        birthLocation: "Boston, MA",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("INITIATION section not found");
        expect(result.initiationFound).toBe(false);
        expect(result.insertionPointFound).toBe(false);
      }
    });

    it("works with varied heading spacing", () => {
      const report = `
1.  Initiation

(L) denotes the identity field.

2. Spectral Origin
`;
      const result = injectBirthAnchoringSentence(report, {
        fullName: "John Smith",
        birthDate: "1 May 1988",
        birthLocation: "London, UK",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.report).toContain("When John Smith was born in London, UK on 1 May 1988");
      }
    });
  });
});
