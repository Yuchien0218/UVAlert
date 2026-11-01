// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGearFormDraft,
  clearScannerPhotosDraft,
  GEAR_FORM_DRAFT_STORAGE_KEY,
  type GearFormDraftState,
  loadGearFormDraft,
  loadScannerPhotosDraft,
  saveGearFormDraft,
  saveScannerPhotosDraft
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
    const spy = vi
      .spyOn(window.sessionStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    try {
      expect(() => saveGearFormDraft(sampleDraft)).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it("gracefully catches exceptions when sessionStorage.getItem throws", () => {
    const spy = vi
      .spyOn(window.sessionStorage, "getItem")
      .mockImplementation(() => {
        throw new Error("SecurityError");
      });
    try {
      expect(loadGearFormDraft()).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it("gracefully catches exceptions when sessionStorage.removeItem throws", () => {
    const spy = vi
      .spyOn(window.sessionStorage, "removeItem")
      .mockImplementation(() => {
        throw new Error("SecurityError");
      });
    try {
      expect(() => clearGearFormDraft()).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it("saves, loads, and clears scanner front/back photos in sessionStorage, and clearGearFormDraft clears both", () => {
    expect(loadScannerPhotosDraft()).toBeNull();

    saveScannerPhotosDraft({
      frontImageDataUrl: "data:image/jpeg;base64,FRONT",
      backImageDataUrl: "data:image/jpeg;base64,BACK"
    });

    expect(loadScannerPhotosDraft()).toEqual({
      frontImageDataUrl: "data:image/jpeg;base64,FRONT",
      backImageDataUrl: "data:image/jpeg;base64,BACK"
    });

    clearScannerPhotosDraft();
    expect(loadScannerPhotosDraft()).toBeNull();

    saveGearFormDraft(sampleDraft);
    saveScannerPhotosDraft({
      frontImageDataUrl: "data:image/jpeg;base64,FRONT_2",
      backImageDataUrl: null
    });
    clearGearFormDraft();
    expect(loadGearFormDraft()).toBeNull();
    expect(loadScannerPhotosDraft()).toBeNull();
  });
});
