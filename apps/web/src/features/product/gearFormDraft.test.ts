// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGearFormDraft,
  GEAR_FORM_DRAFT_STORAGE_KEY,
  type GearFormDraftState,
  loadGearFormDraft,
  saveGearFormDraft
} from "./gearFormDraft";

describe("gearFormDraft", () => {
  const sampleDraft: GearFormDraftState = {
    gearCategory: "sunscreen",
    displayName: "安耐曬金鑽高效防曬露",
    purchaseMonth: "2026-05",
    expiryDate: "2029-05-31",
    note: "清爽好推開",
    priceTwd: "850",
    usageRating: "good",
    spfInput: "50+",
    paGradeInput: "++++",
    snapshotForm: {
      claimAnswer: "yes",
      waitAnswer: "none",
      waitMinutes: null,
      intervalAnswer: "explicit",
      intervalMinutes: 120,
      waterResistance: "80"
    },
    size: "",
    color: "",
    volume: "60ml",
    formulation: "lotion",
    protectionType: "hybrid",
    upf: "",
    shadingRate: "",
    weight: "",
    hatStyle: "",
    uvProtection: "",
    aiFilledFields: ["displayName", "spf", "paGrade"],
    aiNotes: "SPF 50+, PA++++",
    aiScanWarning: null,
    showPhotoScanner: true
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saves and retrieves draft from sessionStorage", () => {
    saveGearFormDraft(sampleDraft);
    const loaded = loadGearFormDraft();
    expect(loaded).toEqual(sampleDraft);
  });

  it("clears draft from sessionStorage", () => {
    saveGearFormDraft(sampleDraft);
    expect(loadGearFormDraft()).not.toBeNull();

    clearGearFormDraft();
    expect(loadGearFormDraft()).toBeNull();
  });

  it("returns null if no draft exists in sessionStorage", () => {
    expect(loadGearFormDraft()).toBeNull();
  });

  it("returns null if sessionStorage contains invalid JSON", () => {
    window.sessionStorage.setItem(GEAR_FORM_DRAFT_STORAGE_KEY, "invalid-json{");
    expect(loadGearFormDraft()).toBeNull();
  });

  it("gracefully catches exceptions when sessionStorage.setItem throws", () => {
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => saveGearFormDraft(sampleDraft)).not.toThrow();
  });

  it("gracefully catches exceptions when sessionStorage.getItem throws", () => {
    vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(loadGearFormDraft()).toBeNull();
  });

  it("gracefully catches exceptions when sessionStorage.removeItem throws", () => {
    vi.spyOn(window.sessionStorage, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => clearGearFormDraft()).not.toThrow();
  });
});
