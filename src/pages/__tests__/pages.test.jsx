import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock IntersectionObserver for Vision.jsx
beforeAll(() => {
  if (!globalThis.IntersectionObserver) {
    globalThis.IntersectionObserver = class {
      constructor(cb) {
        this._cb = cb;
      }
      observe() {
        this._cb([{ isIntersecting: true }]);
      }
      unobserve() {}
      disconnect() {}
    };
  }
});

// Lazy imports match the app's pattern
import MarketplaceApp from "../Dashboard";
import DemandChat from "../Demand";
import SupplyWaitlist from "../Waitlist";
import Vision from "../Vision";

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Dashboard (MarketplaceApp)", () => {
  it("renders without crashing", () => {
    renderWithRouter(<MarketplaceApp />);
    expect(screen.getAllByText(/agenticproxies/i).length).toBeGreaterThanOrEqual(1);
  });
});

describe("DemandChat", () => {
  it("renders without crashing", () => {
    renderWithRouter(<DemandChat />);
    expect(screen.getByText(/Demand Console/i)).toBeInTheDocument();
  });

  it("renders the chat input", () => {
    renderWithRouter(<DemandChat />);
    expect(screen.getByPlaceholderText(/Describe your business challenge/i)).toBeInTheDocument();
  });
});

describe("SupplyWaitlist", () => {
  it("renders without crashing", () => {
    renderWithRouter(<SupplyWaitlist />);
    expect(screen.getByText(/Your agent already works/i)).toBeInTheDocument();
  });
});

describe("Vision", () => {
  it("renders without crashing", () => {
    renderWithRouter(<Vision />);
    expect(screen.getByText(/Phase 01/i)).toBeInTheDocument();
  });
});
